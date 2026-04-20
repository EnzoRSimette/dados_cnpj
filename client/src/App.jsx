import React from "react";
import { useState, useRef } from "react";

export function FileUpload({ onFilesChange }) {
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    const updateFiles = (newFiles) => {
        setFiles(newFiles);
        onFilesChange?.(newFiles);
    };

    const handleFiles = (newFiles) => {
        updateFiles(Array.from(newFiles));
    };

    const handleFileInput = (e) => {
        handleFiles(e.target.files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    const removeFile = (index) => {
        const updated = files.filter((_, i) => i !== index);
        updateFiles(updated);
    };

    return (
        <div className="upload-container">
            <label
                className="upload-box"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <span className="upload-icon">📁</span>
                <p className="upload-text-primary">
                    Arraste seus arquivos aqui
                </p>
                <p className="upload-text-secondary">ou clique para enviar</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInput}
                />
            </label>

            <div className="file-list">
                {files.map((file, index) => (
                    <div key={index} className="file-item">
                        <span className="file-item-name">{file.name}</span>
                        <button
                            className="file-item-remove"
                            onClick={() => removeFile(index)}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BotaoSubmit() {
    return (
        <button
            id="botaoSubmit"
            className=""
            action="submit"
            form="formularioCnpj"
        >
            Consultar
        </button>
    );
}

function App() {
    const [hasFiles, setHasFiles] = useState(false);
    const [ativo, setAtivo] = useState(false);
    const [files, setFiles] = useState([]);
    const handleFilesChange = (files) => {
        setHasFiles(files.length > 0);
        setFiles(files);
    };

    return (
        <div className="bg-blue-800 min-h-screen min-w-screen flex items-center justify-center">
            <form
                action=""
                method="post"
                id="formularioCnpj"
                className="flex flex-col items-center"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (hasFiles == false) {
                        try {
                            const cnpj = e.target.inputCnpj.value;
                            const response = await fetch(
                                `http://localhost:3333/${cnpj}`,
                            );
                            const data = await response.json();
                            console.log(data);
                            return data;
                        } catch (e) {
                            return console.log("Erro: " + e);
                        }
                    } else {
                        const formData = new FormData();
                        files.forEach((file) => {
                            formData.append("arquivo", file);
                        });
                        try {
                            const response = await fetch(
                                "http://localhost:3333/arquivo",
                                {
                                    method: "POST",
                                    body: formData,
                                },
                            );
                            const data = await response.json();
                            console.log(data);
                            return data;
                        } catch (e) {
                            return console.log("Erro: " + e);
                        }
                    }
                }}
            >
                <input
                    type="text"
                    name="inputCnpj"
                    className={`w-100 h-15 pl-4 bg-white rounded-xl outline-none disabled:opacity-40 disabled:cursor-not-allowed ${ativo ? "inner-shadow" : ""}`}
                    id="inputCnpj"
                    placeholder="Insira o Cnpj..."
                    disabled={hasFiles}
                    onFocus={() => setAtivo(true)}
                    onBlur={() => setAtivo(false)}
                />
                <FileUpload onFilesChange={handleFilesChange} />
                <BotaoSubmit />
            </form>
        </div>
    );
}

export default App;
