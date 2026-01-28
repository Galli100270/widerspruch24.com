/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Admin from './pages/Admin';
import AdminStripeEvents from './pages/AdminStripeEvents';
import Agb from './pages/Agb';
import AppReport from './pages/AppReport';
import Assistant from './pages/Assistant';
import BetaDetails from './pages/BetaDetails';
import CaseDetails from './pages/CaseDetails';
import ChoosePlan from './pages/ChoosePlan';
import Dashboard from './pages/Dashboard';
import Datenschutz from './pages/Datenschutz';
import Feedback from './pages/Feedback';
import Health from './pages/Health';
import Home from './pages/Home';
import Impressum from './pages/Impressum';
import Imprint from './pages/Imprint';
import Preview from './pages/Preview';
import Privacy from './pages/Privacy';
import Scanner from './pages/Scanner';
import Schreiben from './pages/Schreiben';
import Terms from './pages/Terms';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AdminStripeEvents": AdminStripeEvents,
    "Agb": Agb,
    "AppReport": AppReport,
    "Assistant": Assistant,
    "BetaDetails": BetaDetails,
    "CaseDetails": CaseDetails,
    "ChoosePlan": ChoosePlan,
    "Dashboard": Dashboard,
    "Datenschutz": Datenschutz,
    "Feedback": Feedback,
    "Health": Health,
    "Home": Home,
    "Impressum": Impressum,
    "Imprint": Imprint,
    "Preview": Preview,
    "Privacy": Privacy,
    "Scanner": Scanner,
    "Schreiben": Schreiben,
    "Terms": Terms,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};