import Home from './pages/Home';
import Scanner from './pages/Scanner';
import Preview from './pages/Preview';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import ChoosePlan from './pages/ChoosePlan';
import Impressum from './pages/Impressum';
import Datenschutz from './pages/Datenschutz';
import Agb from './pages/Agb';
import Imprint from './pages/Imprint';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import CaseDetails from './pages/CaseDetails';
import Assistant from './pages/Assistant';
import BetaDetails from './pages/BetaDetails';
import Feedback from './pages/Feedback';
import Health from './pages/Health';
import Schreiben from './pages/Schreiben';
import AdminStripeEvents from './pages/AdminStripeEvents';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Scanner": Scanner,
    "Preview": Preview,
    "Dashboard": Dashboard,
    "Admin": Admin,
    "ChoosePlan": ChoosePlan,
    "Impressum": Impressum,
    "Datenschutz": Datenschutz,
    "Agb": Agb,
    "Imprint": Imprint,
    "Privacy": Privacy,
    "Terms": Terms,
    "CaseDetails": CaseDetails,
    "Assistant": Assistant,
    "BetaDetails": BetaDetails,
    "Feedback": Feedback,
    "Health": Health,
    "Schreiben": Schreiben,
    "AdminStripeEvents": AdminStripeEvents,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};