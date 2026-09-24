// The four ways to show the wall's names that are being chosen between, by
// the name `?layout=` asks for (screens/Wall.jsx). Development only: a build
// resolves `wall-protos` to none.js (vite.config.js).
import Drafts from './Drafts.jsx'
import Screens from './Screens.jsx'
import Menu from './Menu.jsx'
import Table from './Table.jsx'

export default { drafts: Drafts, screens: Screens, menu: Menu, table: Table }
