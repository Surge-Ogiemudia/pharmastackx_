const Pusher = require('pusher');

const pusher = new Pusher({
  appId: "2152461",
  key: "097f7e40113bef06b815",
  secret: "***REMOVED***",
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
