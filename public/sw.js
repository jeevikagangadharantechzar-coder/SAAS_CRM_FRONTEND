self.addEventListener("push", (event) => {
  const data = event.data.json();
  const title = data.title || "CRM Alert";
  const options = {
    body: data.body,
    icon: "/logo192.png", // or your favicon
    badge: "/logo192.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
