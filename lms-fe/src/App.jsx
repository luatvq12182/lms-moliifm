import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";

import AdminLayout from "./components/AdminLayout.jsx";
import AdminOverview from "./pages/admin/AdminOverview.jsx";
import Courses from "./pages/admin/Courses.jsx";
import Classes from "./pages/admin/Classes.jsx";
import Teachers from "./pages/admin/Teachers.jsx";
import Materials from "./pages/admin/Materials.jsx";
import Profile from "./pages/admin/Profile.jsx";
import Account from "./pages/Account.jsx";
import SlideViewer from "./pages/SlideViewer.jsx";
import ActivityLogs from "./pages/admin/ActivityLogs.jsx";

export default function App() {
    const { isAuthed } = useAuth();

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    isAuthed ? <Navigate to="/admin/profile" replace /> : <Login />
                }
            />

            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/admin/profile" replace />} />
                <Route path="/account" element={<Account />} />
                <Route path="/viewer/:id" element={<SlideViewer />} />

                <Route path="/admin" element={<AdminLayout />}>
                    {/* <Route index element={<AdminOverview />} />
                    <Route path="courses" element={<Courses />} />
                    <Route path="classes" element={<Classes />} /> */}
                    <Route path="teachers" element={<Teachers />} />
                    <Route path="materials" element={<Materials />} />
                    <Route path="activity-logs" element={<ActivityLogs />} />
                    <Route path="profile" element={<Profile />} />
                </Route>
            </Route>

            <Route
                path="*"
                element={
                    <Navigate to={isAuthed ? "/admin/profile" : "/login"} replace />
                }
            />
        </Routes>
    );
}
