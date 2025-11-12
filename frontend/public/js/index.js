document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("network-bg");
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const nodes = Array.from({ length: 60 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
  }));

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 - dist / 1000})`;
          ctx.lineWidth = 1;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
      ctx.fill();

      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  draw();
});
