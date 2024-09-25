const axios = require("axios");

// Function to compute Basic Auth header from API key and secret key
function getBasicAuthHeader(apiKey, secretKey) {
  const credentials = `${apiKey}:${secretKey}`;
  const base64Credentials = Buffer.from(credentials).toString("base64");
  return `Basic ${base64Credentials}`;
}

// Export the function as a serverless function
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    console.log("Incoming form data:", req.body);

    // Extract necessary fields from the form data
    const { amount, currency, order_id, return_url, cancel_url } = req.body;

    // Mapping the missing fields
    const description = `Order #${order_id}`; // Using order_id as a default description
    const success_url = return_url;
    const error_url = cancel_url;

    // Validation for Clip required fields
    if (!amount || !currency || !description || !success_url || !error_url) {
      return res.status(400).json({
        message:
          "Missing required fields for Clip payment: amount, currency, description, success_url, error_url",
      });
    }

    // Compute Basic Auth header using API key and secret key from environment variables
    const apiKey = process.env.CLIP_API_KEY;
    const secretKey = process.env.CLIP_SECRET_KEY;
    const basicAuthHeader = getBasicAuthHeader(apiKey, secretKey);

    // Debug: Print the Authorization header to ensure it's correct
    console.log("Authorization Header:", basicAuthHeader);

    // Call Clip API to create payment link
    const clipApiUrl = "https://api.payclip.com/v2/checkout";

    // Make the request and log the headers and body for debugging
    const body = {
      amount: parseFloat(amount).toFixed(2),
      currency: currency,
      purchase_description: description,
      redirection_url: {
        success: success_url,
        error: error_url,
      },
      metadata: {
        external_reference: order_id,
      },
    };
    console.log("Clip API request body:", JSON.stringify(body));
    const response = await axios.post(clipApiUrl, body, {
      headers: {
        Authorization: basicAuthHeader,
        "Content-Type": "application/json",
      },
    });

    const data = response.data;

    // If payment link is successfully generated, redirect to the payment link
    if (response.status === 200) {
      return res.redirect(data.payment_request_url);
    } else {
      return res.status(500).json({
        message: "Error creating Clip payment link",
        details: data,
      });
    }
  } catch (error) {
    // Log the actual error from axios
    console.log(
      "Clip API error response:",
      error.response ? error.response.data : error.message
    );
    return res.status(400).json({
      message: "Error validating SBPay request or creating Clip payment link",
      error: error.message,
    });
  }
};
