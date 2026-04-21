import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Dashboard.css";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_MAP = {
    ATIVA: "ativa",
    SUSPENSA: "suspensa",
    INAPTA: "inapta",
    BAIXADA: "baixada",
};

function getStatusClass(desc) {
    return `db-status db-status--${STATUS_MAP[desc?.toUpperCase()] ?? "inapta"}`;
}

function formatCurrency(value) {
    if (value == null) return null;
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

function formatCep(cep) {
    if (!cep) return null;
    const c = cep.replace(/\D/g, "");
    return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : cep;
}

function buildAddress(emp) {
    return (
        [
            emp.logradouro,
            emp.numero,
            emp.complemento,
            emp.bairro,
            emp.municipio && emp.uf
                ? `${emp.municipio} - ${emp.uf}`
                : emp.municipio || emp.uf,
            formatCep(emp.cep),
        ]
            .filter(Boolean)
            .join(", ") || "—"
    );
}

function getInitials(name) {
    if (!name) return "?";
    return name
        .split(" ")
        .filter((w) => w.length > 2)
        .slice(0, 2)
        .map((w) => w[0])
        .join("");
}

const AVATAR_COLORS = ["#fbca1f", "#b3e5fc", "#c8e6c9", "#ffe0b2", "#e1bee7"];

// ─── Componentes base ──────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
    if (value == null || value === "") return null;
    return (
        <div className="db-info-row">
            <span className="db-info-row__label">{label}</span>
            <span className="db-info-row__value">{value}</span>
        </div>
    );
}

function Card({ title, accent = false, children }) {
    return (
        <div className="db-card">
            <div
                className={`db-card__header${accent ? " db-card__header--accent" : ""}`}
            >
                <span className="db-card__header-title">{title}</span>
            </div>
            <div className="db-card__body">{children}</div>
        </div>
    );
}

function SocioCard({ socio, index }) {
    const initials = getInitials(socio.nome_socio);
    const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const qual = socio.qualificacao_socio ?? "—";
    const hasDetails =
        socio.cnpj_cpf_do_socio ||
        socio.nome_representante_legal ||
        socio.data_entrada_sociedade;

    return (
        <div className="db-socio">
            <div className="db-socio__avatar" style={{ background: avatarBg }}>
                {initials}
            </div>
            <div className="db-socio__body">
                <p className="db-socio__name">{socio.nome_socio ?? "—"}</p>
                <span className="db-socio__qual">{qual}</span>

                <div className="db-socio__tags">
                    {socio.faixa_etaria && (
                        <span className="db-socio__tag">
                            {socio.faixa_etaria}
                        </span>
                    )}
                    {socio.pais && socio.pais !== "Brasil" && (
                        <span className="db-socio__tag db-socio__tag--warning">
                            {socio.pais}
                        </span>
                    )}
                </div>

                {hasDetails && (
                    <div className="db-socio__detail-row">
                        {socio.cnpj_cpf_do_socio && (
                            <span className="db-socio__detail">
                                <strong>CPF/CNPJ:</strong>{" "}
                                {socio.cnpj_cpf_do_socio}
                            </span>
                        )}
                        {socio.data_entrada_sociedade && (
                            <span className="db-socio__detail">
                                <strong>Entrada na sociedade:</strong>{" "}
                                {socio.data_entrada_sociedade}
                            </span>
                        )}
                        {socio.nome_representante_legal && (
                            <span className="db-socio__detail">
                                <strong>Rep. Legal:</strong>{" "}
                                {socio.nome_representante_legal}
                                {socio.qualificacao_representante_legal
                                    ? ` — ${socio.qualificacao_representante_legal}`
                                    : ""}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Vista principal de empresa ─────────────────────────────────────────────────

function CompanyView({ company }) {
    const statusDesc =
        company.descricao_situacao_cadastral ??
        String(company.situacao_cadastral ?? "");
    const address = buildAddress(company);
    const qsa = company.qsa ?? [];

    const atividadePrincipal = company.cnae_fiscal
        ? `${company.cnae_fiscal} — ${company.cnae_fiscal_descricao ?? ""}`
        : null;

    const atividadesSecundarias =
        Array.isArray(company.cnaes_secundarios) &&
        company.cnaes_secundarios.length > 0
            ? company.cnaes_secundarios
                  .map((c) => `${c.codigo} — ${c.descricao}`)
                  .join("\n")
            : null;

    const simples =
        company.opcao_pelo_simples ?? company.simples?.opcao_pelo_simples;
    const mei = company.opcao_pelo_mei ?? company.mei?.opcao_pelo_mei;

    return (
        <div className="db-company-grid">
            {/* ── Coluna Esquerda ── */}
            <div className="db-company-col">
                <Card title="Dados da Empresa">
                    <div className="db-company-header">
                        <div className="db-company-header__top">
                            <div className="db-company-header__names">
                                <h2 className="db-company-header__razao">
                                    {company.razao_social ?? "—"}
                                </h2>
                                {company.nome_fantasia && (
                                    <p className="db-company-header__fantasia">
                                        {company.nome_fantasia}
                                    </p>
                                )}
                            </div>
                            <span className={getStatusClass(statusDesc)}>
                                {statusDesc || "?"}
                            </span>
                        </div>
                        <code className="db-company-header__cnpj">
                            {company.cnpj}
                        </code>
                    </div>

                    {(simples != null || mei != null) && (
                        <div className="db-pill-row">
                            {simples != null && (
                                <span
                                    className={`db-pill ${simples ? "db-pill--green" : "db-pill--red"}`}
                                >
                                    {simples ? "✓" : "✗"} Simples Nacional
                                </span>
                            )}
                            {mei != null && (
                                <span
                                    className={`db-pill ${mei ? "db-pill--yellow" : ""}`}
                                >
                                    {mei ? "✓" : "✗"} MEI
                                </span>
                            )}
                        </div>
                    )}

                    <InfoRow
                        label="Natureza Jurídica"
                        value={company.natureza_juridica}
                    />
                    <InfoRow label="Porte" value={company.porte} />
                    <InfoRow
                        label="Capital Social"
                        value={formatCurrency(company.capital_social)}
                    />
                    <InfoRow
                        label="Data de Abertura"
                        value={company.data_inicio_atividade}
                    />
                    <InfoRow
                        label="Situação desde"
                        value={company.data_situacao_cadastral}
                    />
                    <InfoRow
                        label="Qualif. do Responsável"
                        value={company.qualificacao_do_responsavel}
                    />
                    <InfoRow
                        label="Atividade Principal"
                        value={atividadePrincipal}
                    />
                    {atividadesSecundarias && (
                        <InfoRow
                            label={`Atividades Secundárias (${company.cnaes_secundarios.length})`}
                            value={atividadesSecundarias}
                        />
                    )}
                </Card>

                <Card title="Contato & Endereço" accent>
                    <InfoRow label="Endereço" value={address} />
                    <InfoRow
                        label="Telefone 1"
                        value={company.ddd_telefone_1 ?? company.telefone}
                    />
                    <InfoRow
                        label="Telefone 2"
                        value={company.ddd_telefone_2}
                    />
                    <InfoRow label="Fax" value={company.ddd_fax} />
                    <InfoRow label="E-mail" value={company.email} />
                </Card>
            </div>

            {/* ── Coluna Direita — Sócios ── */}
            <div className="db-company-col--socios">
                <Card title={`Quadro Societário (${qsa.length})`}>
                    {qsa.length === 0 ? (
                        <p
                            style={{
                                color: "#888",
                                fontSize: "14px",
                                padding: "16px 0",
                                textAlign: "center",
                                margin: 0,
                            }}
                        >
                            Nenhum sócio registrado.
                        </p>
                    ) : (
                        <div style={{ paddingTop: "12px" }}>
                            {qsa.map((socio, i) => (
                                <SocioCard key={i} socio={socio} index={i} />
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

// ─── Dashboard principal ────────────────────────────────────────────────────────

function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const companies = location.state?.companies ?? [];
    const [selected, setSelected] = useState(0);

    const handleExport = () => {
        const json = JSON.stringify(companies, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "empresas_export.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    if (companies.length === 0) {
        return (
            <div className="db-empty">
                <p className="db-empty__text">Nenhuma empresa para exibir.</p>
                <button className="db-btn-export" onClick={() => navigate("/")}>
                    ← Voltar
                </button>
            </div>
        );
    }

    const current = companies[selected];

    return (
        <div className="db-root">
            {/* ── Sidebar ── */}
            <aside className="db-sidebar">
                <div className="db-sidebar__header">
                    <p className="db-sidebar__header-title">Empresas</p>
                    <p className="db-sidebar__header-count">
                        {companies.length} registro
                        {companies.length !== 1 ? "s" : ""}
                    </p>
                </div>

                <nav className="db-sidebar__nav">
                    {companies.map((company, i) => {
                        const isActive = i === selected;
                        const desc = company.descricao_situacao_cadastral ?? "";
                        return (
                            <button
                                key={i}
                                onClick={() => setSelected(i)}
                                className={`db-nav-item${isActive ? " db-nav-item--active" : ""}`}
                            >
                                <span className="db-nav-item__name">
                                    {company.nome_fantasia ||
                                        company.razao_social ||
                                        "—"}
                                </span>
                                <span className="db-nav-item__cnpj">
                                    {company.cnpj}
                                </span>
                                {(company.municipio || company.uf) && (
                                    <span className="db-nav-item__uf">
                                        {[company.municipio, company.uf]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </span>
                                )}
                                <span className="db-nav-item__badge">
                                    {desc || "?"}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="db-sidebar__footer">
                    <button
                        className="db-btn-back"
                        onClick={() => navigate("/")}
                    >
                        ← Nova Consulta
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="db-main">
                <header className="db-topbar">
                    <div className="db-topbar__info">
                        <h1 className="db-topbar__title">
                            {current?.razao_social ?? "—"}
                        </h1>
                        <p className="db-topbar__subtitle">
                            {current?.cnae_fiscal_descricao ?? ""}
                        </p>
                    </div>
                    <div className="db-topbar__right">
                        <span className="db-topbar__export-label">
                            Todos os dados →
                        </span>
                        <button
                            className="db-btn-export"
                            onClick={handleExport}
                        >
                            ↓ Exportar JSON
                        </button>
                    </div>
                </header>

                <div className="db-content">
                    {current && <CompanyView company={current} />}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
