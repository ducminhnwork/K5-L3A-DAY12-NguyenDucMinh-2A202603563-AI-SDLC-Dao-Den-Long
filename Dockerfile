# docker build -t dao-den-long . && docker run -p 5173:5173 dao-den-long   -> http://localhost:5173
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["node", "scripts/run.js", "--no-open", "--port", "5173"]
