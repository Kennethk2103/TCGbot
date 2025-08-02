import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export class DBError extends Error {
  constructor(message, statusCode) {
    super(message); // Call the parent class's constructor with the error message
    this.statusCode = statusCode || 500; // Default to 500 if no status code is provided
    this.name = this.constructor.name; // Set the error's name to the class name
    Error.captureStackTrace(this, this.constructor); // Capture the stack trace (optional)
  }
}
