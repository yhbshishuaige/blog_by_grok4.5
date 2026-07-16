/**
 * Weather Blog — entry
 */
import { createTimeSky } from "./time-sky.js";
import { createTimeDial } from "./time-dial.js";
import { createBackgroundControl } from "./background.js";
import { createSecrets } from "./secrets.js";
import { createCardMotion } from "./card-motion.js";
import { createArticleTools } from "./article-tools.js";
import { createHomeDeck } from "./home-deck.js";
import { createHomeLayout } from "./home-layout.js";
import { createScrollAtmosphere } from "./scroll-atmosphere.js";
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
  const articleTools = createArticleTools();
  const homeDeck = createHomeDeck();
  const homeLayout = createHomeLayout();
  const scrollAtmosphere = createScrollAtmosphere({
    getWeatherType: () => weather.getType(),
  });
  const router = createRouter({
    transitions,
    getWeatherType: () => weather.getType(),
    onRender: (main, route) => {
      cardMotion.bind(main);
      articleTools.bind(main, route);
      homeLayout.bind(main, route);
      homeDeck.bind(main, route);
      scrollAtmosphere.bind(main, route);
    },
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
    articleTools,
    homeDeck,
    homeLayout,
    scrollAtmosphere,
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
