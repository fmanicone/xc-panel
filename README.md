# 🚀 XC Admin Panel

**XC Admin Panel** is a modern, lightweight **XC administration panel** built with **Node.js, Express, and React**.  
It provides a complete backend and frontend solution for managing XC APP, APIs, backups, and app integrations.

> ⭐ If you find this project useful, please consider supporting its development.

---

## ❤️ Support the Project

This project is **free and open-source**, but maintaining and improving it requires time and effort.

<p align="center">
<a href="https://www.buymeacoffee.com/multififa" target="_blank">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" height="45">
</a>
</p>

Even a small donation helps keep the project alive 🙏

---

## 📋 System Requirements

- **Node.js** `18.x` or higher (recommended: `20.x`)
- **npm** `9.x` or higher
- Ubuntu / Debian based server
- Minimum **1 GB RAM** (2 GB recommended)

---

## 🐧 Installation (Ubuntu / Debian)

### 1️⃣ Server Preparation

```bash
sudo apt update && sudo apt upgrade -y
```

Install **Node.js 20.x**:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:

```bash
node --version
npm --version
```

---

### 2️⃣ Clone the Repository

```bash
git clone https://github.com/fmanicone/xc-panel.git
cd xc-panel
```

---

### 3️⃣ Install Dependencies

```bash
npm install
```

---

### 4️⃣ Build for Production

```bash
npm run build
```

---

### 5️⃣ Start the Application

```bash
npm start
```

Open your browser:

```
http://YOUR_SERVER_IP:5000
```

---

## 🔐 Default Login Credentials

| Username | Password |
|---------|----------|
| `admin` | `admin123` |

⚠️ **Important:** Change the password immediately after first login.

---

## ⚙️ PM2 (Recommended for Production)

PM2 keeps the application running and automatically restarts it if it crashes.

```bash
npm install -g pm2
```

Start the app:

```bash
pm2 start npm --name "xc-panel" -- start
```

Enable startup on boot:

```bash
pm2 startup
pm2 save
```

---

## 🌐 Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location = /api/ottrun/ApiIPTV.php {

        if ($arg_tag = "intro") {
            rewrite ^/api/ottrun/ApiIPTV\.php$ /api/intro.php last;
        }

        rewrite ^/api/ottrun/ApiIPTV\.php$ /api/ApiIPTV.php last;
    }

    location /uploads/ {
        alias <main_dir_code>/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /vpn/ {
        alias <main_dir_code>/vpn/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location /uploads/ {
        alias /var/www/xc-panel/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 100M;
}
```

---

## 📁 Project Structure

```
/var/www/xc-panel/
├── client/
├── server/
├── shared/
├── data/
├── uploads/
├── dist/
└── package.json
```

---

## ❤️ Donation

If you enjoy using this project and want to support future updates:

<p align="center">
<a href="https://www.buymeacoffee.com/multififa" target="_blank">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" height="45">
</a>
</p>

---

**Made with ❤️ by multififa**
