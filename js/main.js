/**
 * Weather Blog — entry
 */
import { createTimeSky } from "./time-sky.js";
import { createTimeDial } from "./time-dial.js";
import { createWeather } from "./weather.js";
import { createTransitions } from "./transitions.js";
import { createRouter } from "./router.js";

async function boot() {
  const timeSky = createTimeSky();
  timeSky.start();

  const timeDial = createTimeDial(timeSky);

  const weather = createWeather();
  await weather.init();

  const transitions = createTransitions();
  const router = createRouter({
    transitions,
    getWeatherType: () => weather.getType(),
  });
  router.start();

  // Expose for console playground
  window.WeatherBlog = {
    weather,
    timeSky,
    timeDial,
    transitions,
    router,
  };

  console.log(
    "%cWeather Blog ready %c· try WeatherBlog.weather.cyclePreview() or timeSky.setHour(6.5)",
    "color:#ffe6a8;font-weight:bold",
    "color:#889"
  );
}

boot().catch((err) => {
  console.error("Boot failed:", err);
  document.getElementById("main").innerHTML = `
    <div class="not-found">
      <h1>启动出错</h1>
      <p>${String(err?.message || err)}</p>
    </div>
  `;
});
