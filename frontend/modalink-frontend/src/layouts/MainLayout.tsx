import SideBar from "../components/SideBar";


export default function MainLayout({ children }: any){
  return(
    <div style={{ display: "flex", height: "100vh" }}>
      <SideBar />

      <div style={{ flex: 1, background: "#eee"}}>
        {children}
      </div>
    </div>
  );
}
