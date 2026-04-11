// Creates the application database user on first run.
// Mounted into /docker-entrypoint-initdb.d/ in docker-compose.
// Credentials come from environment variables set in docker-compose.yml.

const dbName = _getEnv("MONGO_APP_DB") || "media";
const appUser = _getEnv("MONGO_APP_USER") || "privapaid";
const appPass = _getEnv("MONGO_APP_PASSWORD");

if (!appPass) {
  print("WARNING: MONGO_APP_PASSWORD not set. Skipping app user creation.");
  quit(0);
}

db = db.getSiblingDB(dbName);

// Create or update the application user
try {
  db.createUser({
    user: appUser,
    pwd: appPass,
    roles: [{ role: "readWrite", db: dbName }],
  });
  print(`Created user '${appUser}' on database '${dbName}'`);
} catch (e) {
  if (e.codeName === "DuplicateKey" || e.code === 11000) {
    db.updateUser(appUser, { pwd: appPass });
    print(`Updated password for existing user '${appUser}'`);
  } else {
    throw e;
  }
}
