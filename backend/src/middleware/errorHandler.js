export const errorHandler = (err, req, res, _next) => {
  console.error(`[${req.method}] ${req.path}`, err);

  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, error: 'Record already exists (unique constraint)' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Internal server error' : err.message,
  });
};
