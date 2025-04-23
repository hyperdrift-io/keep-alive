# keep-alive

> ✦ _“Because downtime is for humans, not apps.”_

---

## ✦ What It Does

**keep-alive** is a lightweight, self-hosted uptime pinger with a clean UI and zero distractions. It continuously monitors the health of multiple endpoints to prevent cold starts and unintentional sleep — especially on free-tier services or serverless APIs.

Ideal for solo devs, cron wizards, indie hackers, and side project hoarders.

---

## ✦ Features

- 🔗 Monitor health status of multiple URLs to prevent cold starts
- ⚙️ Configurable ping intervals (1, 5, or 10 minutes)
- 🧠 Per-endpoint customizable ping intervals
- 🧭 Easy-to-use interface for managing endpoints
- 📊 Real-time status updates with visual indicators
- 🖥️ Background PM2 logs display
- 🎨 Modern, responsive design with **Keep Alive Protocol** theme
- 🔁 Live reload during development for easy UI testing

---

## ✦ Real Use Cases

☍ “I need my cronjob to stay warm while I sleep.”  
☍ “This keeps my Vercel + Notion API from freezing up.”  
☍ “I run side projects on free tiers and don’t want to pay for uptime monitoring.”  
☍ “I needed something simple and visual — not another YAML horror.”

---

## ✦ Security Considerations

This app was designed with security in mind:

- ✅ Input validation for all URLs
- ✅ Rate limiting and timeouts for URI health checks
- ✅ Graceful error handling to prevent information leakage

---

<details>
<summary>✦ Getting Started</summary>

```bash
# Clone the repo
git clone https://github.com/hyperdrift-io/keep-alive.git
cd keep-alive

# Install dependencies
npm install

# Start the app
npm start
```

🛠 Modify your monitored URLs and intervals in [`config.json`](./config.json)

</details>

---

## ✦ Topics

```
keepalive • uptime-monitor • heartbeat • anti-idle • automation • cli-tool • hyperdrift
```

---

## ✦ License

MIT — built to be remixed, reused, and kept alive across the edge.

---

**[hyperdrift-io/keep-alive](https://github.com/hyperdrift-io/keep-alive)**  
✦ _Open-source tools for the forgotten edge._
