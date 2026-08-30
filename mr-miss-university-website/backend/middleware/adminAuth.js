// Simple shared-password admin check.
//
// This is intentionally lightweight for a small club project: one password,
// no sessions, no user accounts. It is NOT the same level of security as a
// real login system with hashed passwords and per-admin accounts.
// If you plan to run this for a real, high-profile event, consider upgrading
// to proper authentication (e.g. bcrypt + JWT, or a hosted auth provider)
// before publishing the admin URL to your team.

function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ message: 'Server misconfiguration: ADMIN_PASSWORD is not set.' });
  }

  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid or missing admin credentials.' });
  }

  next();
}

module.exports = adminAuth;
