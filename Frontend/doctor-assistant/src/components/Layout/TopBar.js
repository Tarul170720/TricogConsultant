import 'bootstrap/dist/css/bootstrap.min.css';
import useShowChatWindowStore from "../../store/useShowChatWindowStore";
const TopBar = () => {
  const handleLogoClick = () => {
    useShowChatWindowStore.setState({ showChat: false });
    useShowChatWindowStore.setState({ showAdminPanel: false });
  }

  const handleAdminClick = () => {
    useShowChatWindowStore.setState({ showAdminPanel: true });
    useShowChatWindowStore.setState({ showChat: false });
  }
  const handleChatClick = () => {
    useShowChatWindowStore.setState({ showChat: true });
    useShowChatWindowStore.setState({ showAdminPanel: false });
  }
  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm" style={{ backgroundColor: '#173463' }}>
      <div className="container-fluid d-flex align-items-center" style={{ height: '60px', position: 'relative' }}>
        <span className="navbar-brand d-flex align-items-center" href="#" style={{ gap: '0.5rem' }} onClick={handleLogoClick}>
          <span role="img" aria-label="doctor" style={{ fontSize: '2.5rem', color: '#b32d2d' }}>
            <span class="material-symbols-outlined">
              cardiology
            </span>
          </span>
          <span style={{ fontWeight: 600, fontSize: '1.3rem' }}>Tricog</span>
        </span>
        <button onClick={handleChatClick} style={{ position: 'absolute', right: '100px', background: '#b32d2d', border: '1px solid #fff', color: 'white', fontSize: '1rem', cursor: 'pointer', padding: '5px 10px', borderRadius: '5px' }}>
          Chat
        </button>
        <button onClick={handleAdminClick} style={{ position: 'absolute', right: '20px', background: '#b32d2d', border: '1px solid #fff', color: 'white', fontSize: '1rem', cursor: 'pointer', padding: '5px 10px', borderRadius: '5px' }}>
          Admin
        </button>
      </div>
    </nav>
  );
};

export default TopBar;
