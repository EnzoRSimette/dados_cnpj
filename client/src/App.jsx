import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export function FileUpload({ onFilesChange }) {
    const [files, setFiles] = useState([]);

    const updateFiles = (newFiles) => {
        const arr = Array.from(newFiles);
        setFiles(arr);
        onFilesChange?.(arr);
    };

    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
        e.preventDefault();
        updateFiles(e.dataTransfer.files);
    };
    const removeFile = (index) => {
        const updated = files.filter((_, i) => i !== index);
        setFiles(updated);
        onFilesChange?.(updated);
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
                    type="file"
                    accept=".txt"
                    onChange={(e) => updateFiles(e.target.files)}
                />
            </label>
            <div className="file-list">
                {files.map((file, index) => (
                    <div key={index} className="file-item">
                        <span className="file-item-name">{file.name}</span>
                        <button
                            type="button"
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

function App() {
    const navigate = useNavigate();
    const [hasFiles, setHasFiles] = useState(false);
    const [files, setFiles] = useState([]);
    const [ativo, setAtivo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState(null);

    const handleFilesChange = (newFiles) => {
        setFiles(newFiles);
        setHasFiles(newFiles.length > 0);
        setErro(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro(null);
        setLoading(true);

        try {
            let companies = [];

            if (hasFiles) {
                // Modo arquivo: envia .txt com lista de CNPJs
                const formData = new FormData();
                files.forEach((file) => formData.append("arquivo", file));

                const response = await fetch("http://localhost:3333/arquivo", {
                    method: "POST",
                    body: formData,
                });
                const json = await response.json();

                if (!json.sucesso)
                    throw new Error(json.erro || "Erro no servidor");
                companies = json.dados; // array de empresas

                if (json.erros > 0) {
                    console.warn(
                        `${json.erros} CNPJ(s) não encontrados:`,
                        json.detalhes_erros,
                    );
                }
            } else {
                // Modo CNPJ único
                const cnpj = e.target.inputCnpj.value.trim();
                if (!cnpj) {
                    setErro("Insira um CNPJ ou envie um arquivo.");
                    setLoading(false);
                    return;
                }

                const response = await fetch(
                    `http://localhost:3333/cnpj/${cnpj}`,
                );
                const json = await response.json();

                if (!json.sucesso)
                    throw new Error(json.dados?.erro || "CNPJ não encontrado");
                companies = [json.dados]; // array com um único item
            }

            if (companies.length === 0) {
                setErro("Nenhuma empresa encontrada.");
                setLoading(false);
                return;
            }

            // Navega para o dashboard passando os dados via state do router
            navigate("/dashboard", { state: { companies } });
        } catch (err) {
            setErro(err.message || "Erro inesperado. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-blue-800 min-h-screen min-w-screen flex items-center justify-center">
            <form
                id="formularioCnpj"
                className="flex flex-col items-center"
                onSubmit={handleSubmit}
            >
                <input
                    type="text"
                    name="inputCnpj"
                    className={`w-100 h-15 pl-4 bg-white rounded-xl outline-none disabled:opacity-40 disabled:cursor-not-allowed`}
                    id="inputCnpj"
                    placeholder="Insira o CNPJ..."
                    disabled={hasFiles || loading}
                    onFocus={() => setAtivo(true)}
                    onBlur={() => setAtivo(false)}
                />

                <FileUpload onFilesChange={handleFilesChange} />

                {erro && (
                    <p
                        style={{
                            color: "#fff",
                            background: "#c0392b",
                            border: "2px solid #922b21",
                            borderRadius: "8px",
                            padding: "8px 16px",
                            marginBottom: "12px",
                            fontSize: "14px",
                            fontWeight: "600",
                        }}
                    >
                        {erro}
                    </p>
                )}

                <button
                    id="botaoSubmit"
                    type="submit"
                    disabled={loading}
                    style={
                        loading ? { opacity: 0.6, cursor: "not-allowed" } : {}
                    }
                >
                    {loading ? "Consultando..." : "Consultar"}
                </button>
            </form>
        </div>
    );
}

export default App;
