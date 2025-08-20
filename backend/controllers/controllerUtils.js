import dotenv from 'dotenv';
import User from "../models/user.js";
dotenv.config();


export class DBError extends Error {
  constructor(message, statusCode) {
    super(message); // Call the parent class's constructor with the error message
    this.statusCode = statusCode || 500; // Default to 500 if no status code is provided
    this.name = this.constructor.name; // Set the error's name to the class name
    Error.captureStackTrace(this, this.constructor); // Capture the stack trace (optional)
  }
}

export const authWithDiscordId = async (req, res, next) => {
  const discordId = req.body.callerID;

  if (!discordId) {
    return res.status(400).json({ message: "discordId is required" });
  }

  try {
    const user = await User.findOne({ DiscordID: discordId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user; 
    next();
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


export const checkIfAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin == true) {
    next(); 
  } else {
    res.status(403).json({ message: 'Access denied. Admins only.' });
  }
}
