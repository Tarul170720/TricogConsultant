import 'bootstrap/dist/css/bootstrap.min.css';
// Use public folder image path for logo
import PageWrapper from "../PageWrapper";
import useShowChatWindowStore from "../../store/useShowChatWindowStore";
import AdminPanel from '../AdminPanel';
import styles from "../../styles";

const MainPage = () => {

  const isChatWindowOpen = useShowChatWindowStore((state) => state.showChat);
  const isAdminPanelOpen = useShowChatWindowStore((state) => state.showAdminPanel);

  const handleChatClick = () => {
    useShowChatWindowStore.setState({ showChat: true });
    useShowChatWindowStore.setState({ showAdminPanel: false });
  }
  if (isChatWindowOpen) return <PageWrapper />;
  if (isAdminPanelOpen) return <AdminPanel styles={styles}/>;
  return (
    <div className="container py-5">
      <div className="row justify-content-center align-items-center">
        <div className="col-auto">
          <img src="/Tricog-Logo-600x139.webp" alt="Tricog Logo" style={{ width: 200, height: 100, border: 0 }} />
        </div>
        <div className="col-auto">
          <h1 className="fw-bold mb-0" style={{ fontSize: '2.2rem', color:'#fff' }}>Cardio Consult</h1>
        </div>
      </div>
      <div className="row justify-content-center">
        <div className="col-md-8 text-center">
          <p className="lead" style={{ fontSize: '1.2rem', color: '#fff', marginTop: '1rem', gap: '1rem' }}>
            Welcome to Tricog Cardio Consult! This is an AI-powered heart health assistant for patients to streamline cardiac consultations and manage follow-ups. Whether you're experiencing chest discomfort, irregular heartbeat, or just have questions, CardioConsult is here 24/7 to guide you toward the right care.
          </p>
          <button className="btn btn-primary mt-4 px-4 py-2" style={{fontSize: '1.1rem', backgroundColor: '#b32d2d', color: '#fff'}} onClick={handleChatClick}>
            Chat with us
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
