import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from the VPS backend!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
