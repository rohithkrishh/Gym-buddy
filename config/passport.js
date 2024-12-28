const passport=require("passport")
const GoogleStrategy=require("passport-google-oauth20").Strategy
const User=require("../models/userSchema")
const env=require("dotenv").config()


passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                console.log("Google profile received:", profile);

                let user = await User.findOne({ googleId: profile.id });
                if (user) {
                    console.log("Existing user found:", user);
                    return done(null, user);
                }

                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                if (!email) {
                    console.error("No email found in Google profile");
                    return done(new Error("Email not found"), null);
                }

                user = new User({
                    name: profile.displayName,
                    email: email,
                    googleId: profile.id,
                });
                await user.save();
                console.log("New user created:", user);
                return done(null, user);
            } catch (error) {
                console.error("Error during Google Strategy authentication:", error);
                return done(error, null);
            }
        }
    )
);



passport.serializeUser((user, done) => {
    console.log("Serializing user with ID:", user.id); // Debugging
    done(null, user.id); // Storing user ID in session
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then((user) => {
            console.log("Deserializing user:", user); // Debugging
            done(null, user);
        })
        .catch((err) => {
            console.error("Error during deserialization:", err);
            done(err, null);
        });
});




module.exports=passport

