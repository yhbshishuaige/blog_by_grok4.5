/**
 * Weather Blog — entry
 */
import { createTimeSky } from "./time-sky.js";
import { createTimeDial } from "./time-dial.js";
import { createBackgroundControl } from "./background.js";
import { createSecrets } from "./secrets.js";
import { createCardMotion } from "./card-motion.js";
import { createWeather } from "./weather.js";
import { createTransitions } from "./transitions.js";
import { createRouter } from "./router.js";

async function boot() {
  const timeSky = createTimeSky();
  timeSky.start();

  const timeDial = createTimeDial(timeSky);
  const background = createBackgroundControl();

  const weather = createWeather();
  const weatherReady = weather.init();

  const secrets = createSecrets({ timeSky, weather, background });

  const transitions = createTransitions();
  const cardMotion = createCardMotion();
  const router = createRouter({
    transitions,
    getWeatherType: () => weather.getType(),
    onRender: (main) => cardMotion.bind(main),
  });
  router.start();

  // Expose for console playground
  window.WeatherBlog = {
    weather,
    timeSky,
    timeDial,
    background,
    secrets,
    cardMotion,
    transitions,
    router,
    weatherReady,
  };

  await weatherReady;

  console.log(
    "%cWeather Blog ready %c· WeatherBlog.weather.cyclePreview() · WeatherBlog.timeSky.setHour(6.5)",
    "color:#ffe6a8;font-weight:bold",
    "color:#889"
  );
  console.log(
    "%cHidden scenes %c· WeatherBlog.secrets.list() · WeatherBlog.secrets.tour()",
    "color:#bfe7ff;font-weight:bold",
    "color:#789"
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
