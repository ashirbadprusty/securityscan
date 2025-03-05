import jwt from "jsonwebtoken";

const adminMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ message: "Invalid token format. Use 'Bearer <token>'" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedAdmin) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }

      req.admin = decodedAdmin;
      next();
    });
  } catch (error) {
    console.error("Middleware Error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export { adminMiddleware };
