# Frontend SIC — build Angular + nginx sirviendo estáticos y proxy /v1 → backend
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci
COPY frontend ./frontend
COPY package.json ./
RUN npm run build --prefix frontend

FROM nginx:1.27-alpine AS serve
COPY --from=build /app/frontend/dist/sic-frontend/browser /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
