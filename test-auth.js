const { initializeApp } = require("firebase/app");
const { getAuth, sendSignInLinkToEmail } = require("firebase/auth");
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const config = {
  apiKey: env.match(/NEXT_PUBLIC_FIREBASE_API_KEY=(.*)/)[1].trim(),
  authDomain: "cfd-treats-hub.firebaseapp.com",
  projectId: "cfd-treats-hub",
};

const app = initializeApp(config);
const auth = getAuth(app);

sendSignInLinkToEmail(auth, "test@gmail.com", {
  url: "https://cfd-treats-hub.web.app/verify",
  handleCodeInApp: true,
}).then(() => {
  console.log("SUCCESS: Email sent!");
}).catch(err => {
  console.error("ERROR:");
  console.error(err.code);
  console.error(err.message);
});
