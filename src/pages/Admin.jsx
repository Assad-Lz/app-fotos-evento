import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { r2 } from '../r2Client';
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { useNavigate } from 'react-router-dom';
import {
    LogOut, UploadCloud, CheckCircle2, AlertCircle, Loader2,
    Trash2, ChevronLeft, ChevronRight, Search, Image as ImageIcon,
    Maximize2, ArrowLeft, FileText, XCircle, CheckSquare, Square, Layers, ListChecks
} from 'lucide-react';

// IMAGEM DO BONECO (MANTIDA NO HEADER)
import bonecoMM from '../imgs/boneco_vermelho_mm.png';

// NOVAS LOGOS PARA O BACKGROUND (SVG)
import logoMM from '../imgs/MMS_MARCA.svg';
import logoSnickers from '../imgs/SNICKERS_MARCA.PNG';
import logoTwix from '../imgs/TWIX_MARCA.PNG';

export default function Admin() {
    // UPLOAD
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState([]);
    const [dia, setDia] = useState('07');
    const [mensagem, setMensagem] = useState({ type: '', text: '' });
    const [errosUpload, setErrosUpload] = useState([]);
    const [progresso, setProgresso] = useState({ processados: 0, total: 0, porcentagem: 0 });

    // LISTA E SELEÇÃO
    const [fotos, setFotos] = useState([]);
    const [totalFotosDia, setTotalFotosDia] = useState(0);

    // ESTADOS DE SELEÇÃO
    const [selectedIds, setSelectedIds] = useState([]);
    const [isGlobalSelection, setIsGlobalSelection] = useState(false);

    const [loadingList, setLoadingList] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [busca, setBusca] = useState('');
    const itensPorPagina = 10;

    const [previewFoto, setPreviewFoto] = useState(null);
    const navigate = useNavigate();

    // --- PREPARAÇÃO DA FAIXA DE BACKGROUND (CORREÇÃO) ---
    // Cria uma lista única repetindo o padrão 6 vezes para garantir que fiquem lado a lado
    const marcasParaFaixa = [...Array(6)].flatMap(() => [
        { src: logoMM, height: 'h-20', rotate: 'rotate-12' },
        { src: logoSnickers, height: 'h-14', rotate: '-rotate-6' },
        { src: logoTwix, height: 'h-16', rotate: 'rotate-12' }
    ]);
    // ---------------------------------------------------

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) navigate('/login');
        };
        checkUser();
    }, [navigate]);

    useEffect(() => {
        fetchFotos();
        setSelectedIds([]);
        setIsGlobalSelection(false);
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
            const { data, error, count } = await query.range(from, to);

            if (error) throw error;

            setFotos(data);
            setTotalFotosDia(count || 0);

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

    const toggleSelect = (id) => {
        if (isGlobalSelection) return;
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectPage = () => {
        setIsGlobalSelection(false);
        if (selectedIds.length === fotos.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(fotos.map(f => f.id));
        }
    };

    const toggleSelectGlobal = () => {
        if (isGlobalSelection) {
            setIsGlobalSelection(false);
            setSelectedIds([]);
        } else {
            setIsGlobalSelection(true);
            setSelectedIds([]);
        }
    };

    async function handleBulkDelete() {
        if (isGlobalSelection) {
            const confirmacao = prompt(`PERIGO ⚠️\n\nVocê vai apagar TODAS as ${totalFotosDia} fotos do Dia ${dia}.\nIsso não tem volta!\n\nDigite "DELETAR" para confirmar:`);
            if (confirmacao !== "DELETAR") return;

            setLoading(true);
            try {
                let temMais = true;
                let page = 0;
                let totalApagado = 0;

                while (temMais) {
                    const { data: lote, error } = await supabase
                        .from('fotos')
                        .select('id, url_imagem, dia_evento')
                        .eq('dia_evento', dia)
                        .range(page * 100, (page * 100) + 99);

                    if (error) throw error;
                    if (!lote || lote.length === 0) {
                        temMais = false;
                        break;
                    }

                    await Promise.all(lote.map(async (f) => {
                        const key = `${f.dia_evento}/${f.url_imagem.split('/').pop()}`;
                        await r2.send(new DeleteObjectCommand({ Bucket: "fotos-evento", Key: key }));
                    }));

                    const idsLote = lote.map(f => f.id);
                    await supabase.from('fotos').delete().in('id', idsLote);

                    totalApagado += lote.length;
                }

                setMensagem({ type: 'success', text: `LIMPEZA TOTAL! ${totalApagado} fotos apagadas.` });
                setIsGlobalSelection(false);
                fetchFotos();

            } catch (err) {
                console.error(err);
                setMensagem({ type: 'error', text: "Erro ao apagar tudo." });
            } finally {
                setLoading(false);
            }
        } else {
            if (selectedIds.length === 0) return;
            if (!confirm(`Apagar ${selectedIds.length} fotos selecionadas?`)) return;

            const fotosParaDeletar = fotos.filter(f => selectedIds.includes(f.id));
            setFotos(prev => prev.filter(f => !selectedIds.includes(f.id)));
            setSelectedIds([]);

            try {
                await Promise.all(fotosParaDeletar.map(async (foto) => {
                    const key = `${foto.dia_evento}/${foto.url_imagem.split('/').pop()}`;
                    await r2.send(new DeleteObjectCommand({ Bucket: "fotos-evento", Key: key }));
                }));

                await supabase.from('fotos').delete().in('id', selectedIds);
                setMensagem({ type: 'success', text: `${fotosParaDeletar.length} fotos apagadas!` });
                fetchFotos();
            } catch (err) {
                console.error(err);
                fetchFotos();
            }
        }
    }

    async function handleDelete(id, url, diaEvento, e) {
        if (e) e.stopPropagation();
        if (!confirm("Apagar foto?")) return;
        setFotos(current => current.filter(foto => foto.id !== id));
        try {
            const key = `${diaEvento}/${url.split('/').pop()}`;
            await r2.send(new DeleteObjectCommand({ Bucket: "fotos-evento", Key: key }));
            await supabase.from('fotos').delete().eq('id', id);
            setMensagem({ type: 'success', text: "Foto apagada!" });
            if (previewFoto?.id === id) setPreviewFoto(null);
        } catch (error) {
            console.error(error);
            fetchFotos();
        }
    }

    async function handleBatchUpload(e) {
        e.preventDefault();
        if (!files.length) { setMensagem({ type: 'error', text: "Selecione fotos!" }); return; }
        setLoading(true); setMensagem({ type: '', text: '' }); setErrosUpload([]);
        setProgresso({ processados: 0, total: files.length, porcentagem: 0 });

        const BATCH = 20;
        const publicUrlBase = import.meta.env.VITE_R2_PUBLIC_URL;
        let sucessos = 0; let listaFalhas = [];

        try {
            for (let i = 0; i < files.length; i += BATCH) {
                const chunk = Array.from(files).slice(i, i + BATCH);
                await Promise.all(chunk.map(async (file) => {
                    try {
                        const match = file.name.match(/^BBD_(\d+)/i);
                        if (!match) throw new Error("Nome inválido (Falta BBD_)");
                        const num = parseInt(match[1]);
                        const path = `${dia}/BBD_${num.toString().padStart(4, '0')}.jpg`;
                        const buf = new Uint8Array(await file.arrayBuffer());

                        await r2.send(new PutObjectCommand({ Bucket: "fotos-evento", Key: path, Body: buf, ContentType: "image/jpeg" }));
                        await supabase.from('fotos').insert([{ numero_foto: num, dia_evento: dia, url_imagem: `${publicUrlBase}/${path}`, nome_original: file.name }]);
                        sucessos++;
                    } catch (err) { listaFalhas.push({ nome: file.name, motivo: err.message }); }
                }));
                const atual = Math.min(i + BATCH, files.length);
                setProgresso({ processados: atual, total: files.length, porcentagem: Math.round((atual / files.length) * 100) });
            }
            setErrosUpload(listaFalhas);
            listaFalhas.length ? alert(`⚠️ ${listaFalhas.length} erros!`) : setMensagem({ type: 'success', text: `Sucesso! ${sucessos} fotos.` });
            setFiles([]); e.target.reset(); fetchFotos();
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }

    return (
        <div className="min-h-screen bg-[#ffcc00] flex flex-col items-center p-6 relative overflow-x-hidden font-sans pb-32">

            {/* BACKGROUND ATUALIZADO E CORRIGIDO (SEM SOBREPOSIÇÃO) */}
            <div className="fixed inset-0 flex items-center justify-center opacity-30 pointer-events-none select-none z-0">
                {/* Aumentei o gap principal para gap-32 e removi os divs aninhados */}
                <div className="w-[300%] flex gap-32 animate-marquee whitespace-nowrap py-16 items-center -rotate-[15deg]">
                    {marcasParaFaixa.map((marca, i) => (
                        // O 'shrink-0' é essencial aqui para elas não se esmagarem
                        <img
                            key={i}
                            src={marca.src}
                            className={`${marca.height} w-auto drop-shadow-xl ${marca.rotate} shrink-0`}
                            alt="Brand Logo"
                        />
                    ))}
                </div>
            </div>

            {(selectedIds.length > 0 || isGlobalSelection) && (
                <div className="fixed bottom-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 w-full px-6 max-w-lg flex justify-center">
                    <button
                        onClick={handleBulkDelete}
                        className={`w-full py-4 rounded-[2rem] shadow-[0_10px_0_0_#991b1b] border-4 border-white flex items-center justify-center gap-3 text-lg font-[900] active:translate-y-1 active:shadow-none transition-all ${isGlobalSelection ? 'bg-[#df0024] text-white animate-pulse' : 'bg-red-600 text-white'}`}
                    >
                        <Trash2 size={24} />
                        {isGlobalSelection
                            ? `APAGAR TUDO (${totalFotosDia} FOTOS)`
                            : `APAGAR ${selectedIds.length} SELECIONADAS`
                        }
                    </button>
                </div>
            )}

            {previewFoto && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
                    <div className="bg-[#4e3629] p-4 flex items-center justify-between shadow-xl border-b-4 border-[#0072bc]">
                        <button onClick={() => setPreviewFoto(null)} className="flex items-center gap-2 text-white font-black hover:text-[#ffcc00] transition-colors"><ArrowLeft size={24} /> VOLTAR</button>
                        <div className="flex flex-col items-center text-center max-w-[60%]">
                            <p className="text-white font-black text-xl">BBD_{previewFoto.numero_foto.toString().padStart(4, '0')}.jpg</p>
                        </div>
                        <button onClick={(e) => handleDelete(previewFoto.id, previewFoto.url_imagem, previewFoto.dia_evento, e)} className="text-white/50 hover:text-red-500"><Trash2 size={24} /></button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setPreviewFoto(null)}>
                        <img src={previewFoto.url_imagem} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
                    </div>
                </div>
            )}

            <button onClick={handleLogout} className="fixed top-6 right-6 flex items-center gap-2 text-[#4e3629] hover:text-[#df0024] font-black z-50 transition-all bg-white/80 p-2 rounded-full shadow-sm"><LogOut size={20} /> SAIR</button>

            {/* CARD PRINCIPAL */}
            <div className="bg-white p-8 rounded-[3rem] shadow-[0_12px_0_0_#4e3629] w-full max-w-lg border-4 border-[#4e3629] z-20 relative my-auto">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-[#df0024] p-4 rounded-full mb-3 shadow-[0_5px_0_0_#a0001a] border-4 border-white">
                        {/* BONECO MANTIDO NO HEADER DO CARD */}
                        <img src={bonecoMM} className="w-10 h-10 object-contain" alt="M&M Boneco" />
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
                            <p className="text-sm font-black text-[#4e3629]">{files.length > 0 ? `${files.length} SELECIONADAS` : "ARRASTE AS FOTOS"}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Padrão Obrigatório: BBD_xxxx.jpg</p>
                        </div>
                    </div>
                    {loading && (
                        <div className="w-full bg-gray-100 rounded-full h-6 border-2 border-gray-200 overflow-hidden relative">
                            <div className="bg-[#00aa55] h-full transition-all duration-300 flex items-center justify-center text-[10px] font-black text-white" style={{ width: `${progresso.porcentagem}%` }}>{progresso.porcentagem > 15 && `${progresso.porcentagem}%`}</div>
                        </div>
                    )}
                    <button disabled={loading} className={`p-5 rounded-[2rem] font-[900] text-xl text-white shadow-[0_8px_0_0_#a0001a] active:scale-95 transition-all ${loading ? 'bg-gray-400' : 'bg-[#df0024]'}`}>
                        {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> ENVIANDO...</span> : "ENVIAR TUDO AGORA 🚀"}
                    </button>
                    {mensagem.text && <div className={`p-4 rounded-xl flex items-center justify-center gap-3 font-bold border-2 ${mensagem.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}><span className="text-sm uppercase text-center">{mensagem.text}</span></div>}
                    {errosUpload.length > 0 && (
                        <div className="w-full bg-red-50 border-4 border-red-100 rounded-2xl p-4 mt-4 text-xs font-bold text-red-800">
                            <h3 className="flex items-center gap-2 text-red-600 mb-2"><XCircle size={16} /> ERROS:</h3>
                            <ul className="max-h-24 overflow-y-auto">{errosUpload.map((e, i) => <li key={i}>{e.nome}: {e.motivo}</li>)}</ul>
                        </div>
                    )}
                </form>

                <div className="flex flex-col gap-4">
                    {/* CABEÇALHO DA LISTA COM DUPLA SELEÇÃO */}
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border-2 border-gray-100">
                        <div className="flex items-center gap-3">
                            {/* 1. SELECIONAR PÁGINA */}
                            <button
                                onClick={toggleSelectPage}
                                disabled={isGlobalSelection}
                                className={`p-2 rounded-lg border-2 transition-all ${selectedIds.length > 0 && !isGlobalSelection ? 'bg-blue-100 border-[#0072bc] text-[#0072bc]' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'}`}
                                title="Selecionar Página Atual"
                            >
                                <ListChecks size={20} />
                            </button>

                            {/* 2. SELECIONAR TUDO (GLOBAL) */}
                            <button
                                onClick={toggleSelectGlobal}
                                className={`p-2 rounded-lg border-2 transition-all flex items-center gap-2 ${isGlobalSelection ? 'bg-red-100 border-[#df0024] text-[#df0024]' : 'bg-white border-gray-200 text-gray-400 hover:border-red-300'}`}
                                title="Selecionar TODAS do Dia"
                            >
                                <Layers size={20} />
                                <span className="text-[10px] font-black uppercase hidden sm:inline">Tudo ({totalFotosDia})</span>
                            </button>
                        </div>

                        <div className="text-right">
                            <span className="text-xs font-bold text-gray-400 block uppercase">Dia {dia}</span>
                            <span className="text-[10px] font-black text-[#0072bc] bg-blue-50 px-2 py-0.5 rounded-full">Total: {totalFotosDia}</span>
                        </div>
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
                            fotos.map((foto) => {
                                const isSelected = isGlobalSelection || selectedIds.includes(foto.id);
                                return (
                                    <div
                                        key={foto.id}
                                        onClick={() => setPreviewFoto(foto)}
                                        className={`flex items-center justify-between p-2 rounded-xl border-2 transition-all group cursor-pointer ${isSelected ? 'bg-blue-50 border-[#0072bc]' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                onClick={(e) => { e.stopPropagation(); toggleSelect(foto.id); }}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-[#0072bc] text-white' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'}`}
                                            >
                                                {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </div>

                                            <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 bg-white relative">
                                                <img src={foto.url_imagem} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-[900] text-[#4e3629]">#{foto.numero_foto.toString().padStart(4, '0')}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">{foto.nome_original ? <FileText size={10} /> : null}{foto.nome_original ? 'Auto' : `Dia ${foto.dia_evento}`}</span>
                                            </div>
                                        </div>
                                        <button onClick={(e) => handleDelete(foto.id, foto.url_imagem, foto.dia_evento, e)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                                    </div>
                                );
                            })
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