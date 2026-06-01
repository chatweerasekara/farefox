const axios = require('axios');

async function sendWhatsAppAlert(message) {
  const phone = encodeURIComponent(process.env.CALLMEBOT_PHONE);
  const text = encodeURIComponent(message);
  const apikey = process.env.CALLMEBOT_APIKEY;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${apikey}`;

  try {
    const res = await axios.get(url, { timeout: 10000 });
    // Callmebot returns HTTP 200/203 even on failure — check the body
    const body = String(res.data ?? '');
    if (body.toLowerCase().includes('apikey is invalid') || body.toLowerCase().includes('error')) {
      console.error('[Alerts] WhatsApp rejected by Callmebot:', body.replace(/<[^>]+>/g, ' ').trim());
    } else {
      console.log('[Alerts] WhatsApp sent OK:', message);
    }
  } catch (err) {
    console.error('[Alerts] WhatsApp failed:', err.message);
  }
}

module.exports = { sendWhatsAppAlert };
