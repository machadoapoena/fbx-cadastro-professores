import express from "express";
import path from "path";
import router from "./api/routes";

const app = express();
const PORT = 3000;
const isVercel = !!process.env.VERCEL;

// Body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount all API routes under /api
app.use("/api", router);

// --- VITE DEV AND PRODUCTION HANDLING ---

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!isVercel) {
  start();
}

export default app;
