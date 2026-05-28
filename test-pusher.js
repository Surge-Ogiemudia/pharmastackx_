const Pusher = require('pusher');

const pusher = new Pusher({
  appId: "2152461",
  key: "097f7e40113bef06b815",
  secret: "6ba1f6f30a55e661de9e",
  cluster: "eu",
  useTLS: true
});

pusher.trigger("pharmacy-ernosa", "new-order", {
  orderId: "123456789",
  patientName: "John Doe (Test Notification)",
  itemsCount: 3,
  totalAmount: 15500
}).then(() => {
  console.log("Successfully triggered test notification!");
}).catch(e => {
  console.error("Error:", e);
});
