import React, { useMemo, useState } from "react";
import ModalShell from "./ModalShell.jsx";
import UploadModeSwitch from "./UploadModeSwitch.jsx";
import DriveLinksTable from "./DriveLinksTable.jsx";
import LocalFilesTable from "./LocalFilesTable.jsx";

/** AccessEditor: bạn có thể import cái AccessEditor đã có sẵn trong project
 *  Ở đây mình giữ dạng "node" để bạn nhét component AccessEditor của bạn vào.
 */

export default function UploadMaterialsModal({
    open,
    onClose,
    folderId,
    path,
    isAdmin,
    teachers,
    absUrl,

    // UI Access
    AccessEditorComponent, // component của bạn (optional)

    // API handlers
    createOneFromGoogleLink, // async
    uploadOneLocal, // async

    onUploadedDone,
}) {
    const [mode, setMode] = useState("google"); // default google như ảnh
    const [visibility, setVisibility] = useState("public");
    const [allowIds, setAllowIds] = useState([]);

    const folderName = useMemo(() => {
        return path?.length ? path[path.length - 1].name : "Folder gốc";
    }, [path]);

    function handleClose() {
        onClose?.();
    }

    const accessEditorNode =
        !folderId && isAdmin && AccessEditorComponent ? (
            <AccessEditorComponent
                teachers={teachers || []}
                visibility={visibility}
                setVisibility={setVisibility}
                allowIds={allowIds}
                setAllowIds={setAllowIds}
                absUrl={absUrl}
            />
        ) : null;

    return (
        <ModalShell
            open={open}
            title="Upload tài liệu"
            onClose={handleClose}
            maxWidthClass="max-w-5xl"
        >
            <div className="space-y-4">
                <UploadModeSwitch mode={mode} setMode={setMode} />

                {mode === "google" ? (
                    <DriveLinksTable
                        folderName={folderName}
                        folderId={folderId}
                        isAdmin={isAdmin}
                        accessEditorNode={accessEditorNode}
                        createOneFromGoogleLink={createOneFromGoogleLink}
                        visibility={visibility}
                        allowIds={allowIds}
                        onUploadedDone={onUploadedDone}
                    />
                ) : (
                    <LocalFilesTable
                        folderName={folderName}
                        folderId={folderId}
                        isAdmin={isAdmin}
                        accessEditorNode={accessEditorNode}
                        uploadOneLocal={uploadOneLocal}
                        visibility={visibility}
                        allowIds={allowIds}
                        onUploadedDone={onUploadedDone}
                    />
                )}
            </div>
        </ModalShell>
    );
}
