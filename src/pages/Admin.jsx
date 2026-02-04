import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { r2 } from '../r2Client';
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { useNavigate } from 'react-router-dom';
import {
    LogOut, UploadCloud, CheckCircle2, AlertCircle, Loader2,
    Trash2, ChevronLeft, ChevronRight, Search, Image as ImageIcon,
    Maximize2, ArrowLeft, FileText, XCircle
} from 'lucide-react';

import bonecoMM from '../imgs/boneco_vermelho_mm.png';
import pacoteMM from '../imgs/PacotedeMM.png';
import logoSnickers from '../imgs/LogoSnickers.png';
import barraSnickers from '../imgs/barrasnickers.png';

export default function Admin() {
    // ESTADOS DE UPLOAD
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState([]);
    const [dia, setDia] = useState('07');
    const [mensagem, setMensagem] = useState({ type: '', text: '' });

    // RELATÓRIO DE ERROS
    const [errosUpload, setErrosUpload] = useState([]);

    const [progresso, setProgresso] = useState({ processados: 0, total: 0, porcentagem: 0 });
    const [fotos, setFotos] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [busca, setBusca] = useState('');
    const itensPorPagina = 10;
    const [previewFoto, setPreviewFoto] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) navigate('/login');
        };
        checkUser();
    }, [navigate]);

    useEffect(() => {
        fetchFotos();
    }, [pagina, busca, dia]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (loading) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [loading]);

    async function fetchFotos() {
        setLoadingList(true);
        try {
            let query = supabase
                .from('fotos')
                .select('*', { count: 'exact' })
                .eq('dia_evento', dia)
                .order('numero_foto', { ascending: true });

            if (busca) query = query.eq('numero_foto', parseInt(busca));

            const from = (pagina - 1) * itensPorPagina;
            const to = from + itensPorPagina - 1;
            const { data, error } = await query.range(from, to);

            if (error) throw error;
            setFotos(data);
        } catch (error) {
            console.error("Erro lista:", error);
        } finally {
            setLoadingList(false);
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        navigate('/login');
    }

    async function handleDelete(id, url, diaEvento, e) {
        if (e) e.stopPropagation();
        if (!confirm("Tem certeza que quer apagar essa foto?")) return;

        setFotos(current => current.filter(foto => foto.id !== id));

        try {
            const nomeArquivo = url.split('/').pop();
            const key = `${diaEvento}/${nomeArquivo}`;

            await r2.send(new DeleteObjectCommand({ Bucket: "fotos-evento", Key: key }));
            await supabase.from('fotos').delete().eq('id', id);

            setMensagem({ type: 'success', text: "Foto apagada com sucesso!" });
            if (previewFoto && previewFoto.id === id) setPreviewFoto(null);
        } catch (error) {
            console.error(error);
            setMensagem({ type: 'error', text: "Erro ao apagar." });
            fetchFotos();
        }
    }

    // --- UPLOAD COM VALIDAÇÃO ESTRITA BBD_ ---
    async function handleBatchUpload(e) {
        e.preventDefault();
        if (!files || files.length === 0) {
            setMensagem({ type: 'error', text: "Selecione as fotos! 🍫" });
            return;
        }

        setLoading(true);
        setMensagem({ type: '', text: '' });
        setErrosUpload([]);
        setProgresso({ processados: 0, total: files.length, porcentagem: 0 });

        const BATCH_SIZE = 20;
        const publicUrlBase = import.meta.env.VITE_R2_PUBLIC_URL;

        let contSucessos = 0;
        let listaFalhas = [];

        try {
            for (let i = 0; i < files.length; i += BATCH_SIZE) {
                const chunk = Array.from(files).slice(i, i + BATCH_SIZE);

                await Promise.all(chunk.map(async (file) => {
                    try {
                        // REGEX ESTRITA: OBRIGA COMEÇAR COM BBD_ SEGUIDO DE NÚMEROS
                        // ^ = Início da string
                        // BBD_ = Texto obrigatório (case insensitive devido ao flag 'i')
                        // (\d+) = Captura os números logo depois
                        const match = file.name.match(/^BBD_(\d+)/i);

                        if (!match) {
                            throw new Error("Nome inválido. Deve começar com 'BBD_' e ter um número.");
                        }

                        // match[1] pega o grupo dos números capturados
                        const numeroInt = parseInt(match[1]);

                        // PADRONIZAÇÃO (Transforma BBD_1.jpg em BBD_0001.jpg)
                        const formatado = numeroInt.toString().padStart(4, '0');
                        const fileName = `BBD_${formatado}.jpg`;
                        const fullPath = `${dia}/${fileName}`;

                        const arrayBuffer = await file.arrayBuffer();
                        const fileBuffer = new Uint8Array(arrayBuffer);

                        // UPLOAD R2
                        await r2.send(new PutObjectCommand({
                            Bucket: "fotos-evento", Key: fullPath, Body: fileBuffer,
                            ContentType: "image/jpeg", ContentLength: fileBuffer.length,
                        }));

                        // SUPABASE
                        await supabase.from('fotos').insert([{
                            numero_foto: numeroInt,
                            dia_evento: dia,
                            url_imagem: `${publicUrlBase}/${fullPath}`,
                            nome_original: file.name
                        }]);

                        contSucessos++;
                    } catch (err) {
                        console.error(`Falha no arquivo: ${file.name}`, err);
                        listaFalhas.push({ nome: file.name, motivo: err.message || "Erro desconhecido" });
                    }
                }));

                const processadosAtual = Math.min(i + BATCH_SIZE, files.length);
                setProgresso({
                    processados: processadosAtual,
                    total: files.length,
                    porcentagem: Math.round((processadosAtual / files.length) * 100)
                });
            }

            // FINALIZAÇÃO
            setErrosUpload(listaFalhas);

            if (listaFalhas.length > 0) {
                // ALERTA VISUAL
                alert(`⚠️ ATENÇÃO: ${listaFalhas.length} arquivos foram REJEITADOS!\n\nEles não seguiam o padrão "BBD_Número".\nVerifique a lista vermelha abaixo do botão.`);
                setMensagem({ type: 'error', text: `Concluído com ${listaFalhas.length} falhas.` });
            } else {
                setMensagem({ type: 'success', text: `Sucesso total! ${contSucessos} fotos enviadas.` });
            }

            setFiles([]);
            e.target.reset();
            fetchFotos();

        } catch (err) {
            console.error(err);
            setMensagem({ type: 'error', text: "Erro crítico no processo." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#ffcc00] flex flex-col items-center p-6 relative overflow-x-hidden font-sans">
            {/* BACKGROUND */}
            <div className="fixed inset-0 flex items-center justify-center opacity-50 pointer-events-none select-none z-0">
                <div className="w-[300%] flex gap-24 animate-marquee whitespace-nowrap py-12 items-center -rotate-[15deg]">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex gap-24 items-center">
                            <img src={bonecoMM} className="h-24 w-auto drop-shadow-xl rotate-12" alt="boneco" />
                            <img src={logoSnickers} className="h-14 w-auto drop-shadow-lg" alt="logo" />
                            <img src={pacoteMM} className="h-28 w-auto drop-shadow-xl -rotate-6" alt="pacote" />
                            <img src={barraSnickers} className="h-12 w-auto drop-shadow-lg rotate-12" alt="barra" />
                        </div>
                    ))}
                </div>
            </div>

            {/* PREVIEW */}
            {previewFoto && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
                    <div className="bg-[#4e3629] p-4 flex items-center justify-between shadow-xl border-b-4 border-[#0072bc]">
                        <button onClick={() => setPreviewFoto(null)} className="flex items-center gap-2 text-white font-black hover:text-[#ffcc00] transition-colors">
                            <ArrowLeft size={24} /> VOLTAR
                        </button>
                        <div className="flex flex-col items-center text-center max-w-[60%]">
                            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase font-bold text-white/50 tracking-widest mb-1 leading-tight">
                                <FileText size={10} className="shrink-0" />
                                <span className="break-all select-all">{previewFoto.nome_original || 'Sem Reg.'}</span>
                                <span className="text-[#ffcc00] shrink-0">➜</span>
                                <span className="shrink-0">R2 FINAL</span>
                            </div>
                            <p className="text-white font-black text-sm md:text-xl tracking-tight leading-none">
                                BBD_{previewFoto.numero_foto.toString().padStart(4, '0')}.jpg
                            </p>
                        </div>
                        <div className="w-20 flex justify-end">
                            <button onClick={(e) => handleDelete(previewFoto.id, previewFoto.url_imagem, previewFoto.dia_evento, e)} className="text-white/50 hover:text-red-500 transition-colors">
                                <Trash2 size={24} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden cursor-zoom-out" onClick={() => setPreviewFoto(null)}>
                        <img src={previewFoto.url_imagem} alt="Preview" className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-sm cursor-default" onClick={(e) => e.stopPropagation()} />
                    </div>
                </div>
            )}

            <button onClick={handleLogout} className="fixed top-6 right-6 flex items-center gap-2 text-[#4e3629] hover:text-[#df0024] font-black z-50 transition-all active:scale-90 bg-white/80 p-2 rounded-full shadow-sm backdrop-blur-sm">
                <LogOut size={20} /> SAIR
            </button>

            {/* CARD PRINCIPAL */}
            <div className="bg-white p-8 rounded-[3rem] shadow-[0_12px_0_0_#4e3629] w-full max-w-lg border-4 border-[#4e3629] z-20 relative my-auto">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-[#df0024] p-4 rounded-full mb-3 shadow-[0_5px_0_0_#a0001a] border-4 border-white">
                        <img src={bonecoMM} className="w-10 h-10 object-contain" alt="M&M Logo" />
                    </div>
                    <h1 className="text-2xl font-[900] text-[#4e3629] tracking-tight uppercase italic">Upload em Massa</h1>
                </div>

                <form onSubmit={handleBatchUpload} className="flex flex-col gap-5 border-b-4 border-gray-100 pb-8 mb-8">
                    <div className="flex bg-[#4e3629] p-2 rounded-full border-2 border-[#4e3629]">
                        {['07', '08'].map(d => (
                            <button key={d} type="button" onClick={() => setDia(d)} className={`flex-1 py-3 rounded-full font-black text-xs transition-all ${dia === d ? 'bg-[#0072bc] text-white shadow-md' : 'text-gray-300'}`}>DIA {d}</button>
                        ))}
                    </div>

                    <div className="p-6 border-4 border-dashed border-gray-200 rounded-[2rem] hover:border-[#ffcc00] hover:bg-yellow-50 transition-all flex flex-col items-center gap-2 cursor-pointer relative bg-gray-50/50 group">
                        <input type="file" multiple accept="image/jpeg, image/png" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => setFiles(e.target.files)} />
                        <UploadCloud className="text-gray-300 group-hover:text-[#ffcc00] transition-colors" size={40} />
                        <div className="text-center">
                            <p className="text-sm font-black text-[#4e3629]">
                                {files.length > 0 ? `${files.length} FOTOS SELECIONADAS` : "TOQUE OU ARRASTE AS FOTOS AQUI"}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                                {files.length > 0 ? "Pronto para enviar" : "Padrão Obrigatório: BBD_xxxx.jpg"}
                            </p>
                        </div>
                    </div>

                    {loading && (
                        <div className="w-full bg-gray-100 rounded-full h-6 border-2 border-gray-200 overflow-hidden relative">
                            <div className="bg-[#00aa55] h-full transition-all duration-300 flex items-center justify-center text-[10px] font-black text-white" style={{ width: `${progresso.porcentagem}%` }}>
                                {progresso.porcentagem > 15 && `${progresso.porcentagem}%`}
                            </div>
                        </div>
                    )}

                    <button disabled={loading} className={`p-5 rounded-[2rem] font-[900] text-xl text-white shadow-[0_8px_0_0_#a0001a] active:scale-95 transition-all ${loading ? 'bg-gray-400' : 'bg-[#df0024]'}`}>
                        {loading ? (
                            <div className="flex flex-col items-center leading-none">
                                <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> ENVIANDO...</span>
                                <span className="text-[10px] opacity-80 mt-1">{progresso.processados} de {progresso.total}</span>
                            </div>
                        ) : "ENVIAR TUDO AGORA 🚀"}
                    </button>

                    {mensagem.text && (
                        <div className={`p-4 rounded-xl flex items-center justify-center gap-3 font-bold border-2 animate-in slide-in-from-top-2 ${mensagem.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {mensagem.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            <span className="text-sm uppercase text-center">{mensagem.text}</span>
                        </div>
                    )}

                    {/* ÁREA DE LISTA DE ERROS (VERMELHA) */}
                    {errosUpload.length > 0 && (
                        <div className="w-full bg-red-50 border-4 border-red-100 rounded-2xl p-4 mt-4 animate-in fade-in">
                            <div className="flex items-center gap-2 text-red-600 mb-2">
                                <XCircle size={20} />
                                <h3 className="font-black uppercase text-sm">Arquivos Rejeitados:</h3>
                            </div>
                            <ul className="max-h-40 overflow-y-auto space-y-2">
                                {errosUpload.map((erro, index) => (
                                    <li key={index} className="text-xs font-bold text-red-800 bg-red-100 p-2 rounded-lg flex flex-col">
                                        <span className="break-all">{erro.nome}</span>
                                        <span className="text-[10px] uppercase opacity-70">{erro.motivo}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </form>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-[900] text-[#4e3629] uppercase italic">Fotos do Dia {dia}</h2>
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Total: {fotos.length > 0 ? 'Recente' : 0}</span>
                    </div>

                    <div className="relative">
                        <input type="number" placeholder="Buscar número..." value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} className="w-full p-3 pl-10 bg-white border-2 border-gray-200 rounded-xl outline-none focus:border-[#0072bc] text-sm font-bold text-[#4e3629]" />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>

                    <div className="flex flex-col gap-2 min-h-[200px]">
                        {loadingList ? (
                            <div className="flex items-center justify-center h-40 text-gray-400 gap-2"><Loader2 className="animate-spin" /> Carregando...</div>
                        ) : fotos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl"><ImageIcon size={32} className="mb-2 opacity-50" /><p className="text-xs font-bold">Nenhuma foto encontrada</p></div>
                        ) : (
                            fotos.map((foto) => (
                                <div key={foto.id} onClick={() => setPreviewFoto(foto)} className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border-2 border-transparent hover:border-[#0072bc] hover:bg-blue-50 cursor-pointer transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 bg-white relative">
                                            <img src={foto.url_imagem} alt={`Foto ${foto.numero_foto}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all"><Maximize2 size={16} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" /></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-[900] text-[#4e3629]">#{foto.numero_foto.toString().padStart(4, '0')}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">{foto.nome_original ? <FileText size={10} /> : null}{foto.nome_original ? 'Automático' : `Dia ${foto.dia_evento}`}</span>
                                        </div>
                                    </div>
                                    <button onClick={(e) => handleDelete(foto.id, foto.url_imagem, foto.dia_evento, e)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t-2 border-gray-100">
                        <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="p-2 text-[#4e3629] disabled:opacity-30 hover:bg-gray-100 rounded-full transition-all"><ChevronLeft size={20} /></button>
                        <span className="text-xs font-black text-[#0072bc]">PÁGINA {pagina}</span>
                        <button onClick={() => setPagina(p => p + 1)} disabled={fotos.length < itensPorPagina} className="p-2 text-[#4e3629] disabled:opacity-30 hover:bg-gray-100 rounded-full transition-all"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>
            <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 30s linear infinite; }`}</style>
        </div>
    );
}