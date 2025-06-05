import ratelimit from "../config/upstash.js";

const limiterrate = async (req, res, next) => {
  try {
    const { success } = await ratelimit.limit("my-rate-limit");

    if (!success) {
      return res.status(429).json({
        message: "Too many requests, please try again later.",
      });
    }

    // ✅ Let the request continue
    next();
  } catch (error) {
    console.log("Rate limit error", error);
    // Still proceed or you can return 500 if preferred
    next(error);
  }
};

export default limiterrate;
