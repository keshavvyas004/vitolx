/**
 * Real-time bidding via Socket.IO
 * Rooms: product:{productId}
 */
module.exports = (io) => {
  io.on('connection', (socket) => {
    // Join a product's bid room
    socket.on('join_product', (productId) => {
      socket.join(`product:${productId}`);
    });

    socket.on('leave_product', (productId) => {
      socket.leave(`product:${productId}`);
    });

    // Join personal notification room
    socket.on('join_user', (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      // Cleanup handled automatically by Socket.IO
    });
  });
};
