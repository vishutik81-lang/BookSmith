# Используем официальный образ Node.js
FROM node:20-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем зависимости для Playwright (headless браузер)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Устанавливаем Chromium для Playwright
RUN npx playwright install chromium

# Копируем весь код
COPY . .

# Собираем фронтенд (React)
RUN npm run build

# Открываем порт
EXPOSE 5000

# Запускаем сервер
CMD ["npm", "start"]