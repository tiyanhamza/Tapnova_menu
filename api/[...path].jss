
const { handler } = require('../netlify/functions/api.js');

module.exports = async function vercelApi(req, res) {
  try {
    const body =
      req.body == null
        ? ''
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body);

    const result = await handler({
      path: req.url || '/api',
      httpMethod: req.method || 'GET',
      headers: req.headers || {},
      body,
      isBase64Encoded: false,
    });

    for (const [key, value] of Object.entries(result.headers || {})) {
      res.setHeader(key, value);
    }

    res.status(result.statusCode || 200).send(result.body || '');
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
