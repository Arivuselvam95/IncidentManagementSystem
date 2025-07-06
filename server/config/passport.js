 
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
callbackURL: "/api/auth/google/callback"

// Compute __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Point to the actual location of .env at project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('Initializing Google OAuth strategy...' ,process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(null, user);
    }

    // Check if user exists with same email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      await user.save();
      return done(null, user);
    }

    // Create new user with Google profile data
    // Extract name parts
    const fullName = profile.displayName || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    user = new User({
      googleId: profile.id,
      firstName: firstName,
      lastName: lastName,
      email: profile.emails[0].value,
      department: 'Not Specified', // Default value
      role: 'reporter', // Default role
      isActive: true,
      // Generate a random password for Google users (they won't use it)
      password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
    });

    await user.save();
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;