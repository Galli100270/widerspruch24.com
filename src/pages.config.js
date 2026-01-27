import Admin from './pages/Admin';
import AdminStripeEvents from './pages/AdminStripeEvents';
import Agb from './pages/Agb';
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