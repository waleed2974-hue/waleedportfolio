export default async function handler(req, res) {
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    return res.status(200).json({ success: true, inquiry: body });
  }

  return res.status(200).json({ success: true, inquiries: [] });
}

