import mongoose from "mongoose";

const cache = (globalThis.__maisonMongo ??= { conn: null, promise: null });

export async function connectMongo(uri) {
  if (!uri) return null;
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: 10,
        bufferCommands: false,
      })
      .catch((error) => {
        cache.promise = null;
        throw error;
      });
  }

  cache.conn = await cache.promise;
  console.log("[db] connected to MongoDB");
  return cache.conn;
}

export async function disconnectMongo() {
  if (cache.conn) {
    await mongoose.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}
