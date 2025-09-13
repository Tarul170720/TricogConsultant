import 'bootstrap/dist/css/bootstrap.min.css';
import useShowChatWindowStore from "../../store/useShowChatWindowStore";
const TopBar = () => {
  return (
  <nav className="navbar navbar-expand-lg navbar-dark shadow-sm" style={{ backgroundColor: '#173463' }}>
      <div className="container-fluid d-flex align-items-center" style={{height: '60px', position: 'relative'}}>
        <span className="navbar-brand d-flex align-items-center" href="#" style={{gap: '0.5rem'}} onClick={() => useShowChatWindowStore.setState({ showChat: false })}>
          <span role="img" aria-label="doctor" style={{fontSize: '1.8rem'}}>👩‍⚕️</span>
          <span style={{fontWeight: 600, fontSize: '1.3rem'}}>Tricog</span>
        </span>
        <span style={{position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '1.5rem', fontWeight: 'normal', color: '#ffffff'}}>
          Cardio Consult
        </span>
      </div>
    </nav>
  );
};

export default TopBar;
