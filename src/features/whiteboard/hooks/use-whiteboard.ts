"use client"

import { useEffect, useRef, useState} from "react"
import type {
    KeyboardEvent as ReactKeyboardEvent,
    PointerEvent as ReactPointerEvent,
} from "react"


import { documentSchema} from "../schema"

import type {Point , Shape, Tool} from "../schema"

const STORAGE_KEY = "kanva-whiteboard-v1"

type History = {
    past: Shape[][];
    present: Shape[];
    future: Shape[][];
}


type Gesture = {
    pointerId : number;
    mode: "draw" | "move";
    start: Point;
    shape: Shape;
    base: Shape[];
    latest: Shape[];
};


export function useWhiteboard() {
    const [history, setHistory]= useState<History>({
        past: [],
        present: [],
        future: [],
    });


    const [preview, setPreview] = useState<Shape[] | null>(null);

    const [tool, setTool] = useState<Tool>("pen");

    const [color,setColorState]= useState("#292524");
    const [strokeWidth, setStrokeWidthState] = useState(4);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [ready, setReady] = useState(false);

    const [notice, setNotice] = useState("I know you are a lovely drawing explainer :)")

    const gesture = useRef<Gesture | null>(null);


    // bruh how much usestate and how much useeffect i have to write :(

    const shapes = history.present
    const elements = preview ?? shapes


    useEffect(()=> {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);

            if (raw) {
                const parsed = documentSchema.safeParse(JSON.parse(raw));

                if (!parsed.success) {
                    throw new Error("Invalid saved drawing")
                }

                setHistory({
                    past: [],
                    present: parsed.data.elements,
                    future: [],
                })

                setNotice("your drawing i got from localstorage")
            }
        }
        catch {
            setNotice("couldnt resotre a saved drawing")
        } finally {
            setReady(true);
        }
    }, []);


    useEffect(()=> {
        if (!ready) return;

        const timeout = window.setTimeout(()=> {
            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({
                        version: 1,
                        elements: shapes
                    })
                )
            } catch  {
                setNotice("auto save failed :(")
            }
        }, 300);
        return () => window.clearTimeout(timeout);
    }, [shapes, ready])


    function cancelGesture() {
        gesture.current = null;
        setPreview(null);
    }

    function commit(next: Shape[]) {
        setHistory((current)=> {
            if (JSON.stringify(current.present) === JSON.stringify(next)) {
                return current;
            }

            return {
                past: [...current.past, current.present].slice(-100),
                present: next,
                future: [],
            }
        })
    }

    function undo() {
        cancelGesture();
        setSelectedId(null)


        setHistory((current)=> {
            if (!current.past.length) return current;

            return {
                past: current.past.slice(0, -1),
                present: current.past[current.past.length -1],
                future: [current.present, ...current.future]
            }
        })
    }


    function redo() {
        cancelGesture();
        setSelectedId(null);

        setHistory((current)=> {
            if (!current.future.length) return current;

            return {
                past: [...current.past,current.present],
                present: current.future[0],
                future: current.future.slice(1),
            }
        })
    }

    function changeColor(next: string) {
        setColorState(next);
        if (selectedId) {
            commit(
                shapes.map((shape)=> 
                    shape.id === selectedId ? {
                        ...shape,
                        color:next
                    }: shape
                )
            )
        }
    }

    function changeStrokeWidth(next:number) {
        setStrokeWidthState(next);

        if (selectedId) {
            commit(
                shapes.map((shape)=> 
                    shape.id === selectedId ? {
                        ...shape, strokeWidth:next
                    }: shape
                )
            )
        }
    }

    function getPoint(event: ReactPointerEvent<SVGSVGElement>): Point | null {
        const matrix = event.currentTarget.getScreenCTM();

        if (!matrix) return null;
        const point = new DOMPoint(
            event.clientX,
            event.clientY
        ).matrixTransform(matrix.inverse());
        
        return {x: point.x , 
            y: point.y
        };
    }


    function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
        if (event.button !== 0 || !event.isPrimary || gesture.current) {
            return
        }

        const point = getPoint(event);

        if (!point ) return


        event.preventDefault();

        event.currentTarget.focus();


        const target = (event.target as Element).closest("[data-shape-id]")
        
        const id = target?.getAttribute("data-shape-id")
        const hit = shapes.find((shape)=> shape.id === id);

        if (tool === "erase" ) {
            if (hit) {
                commit(shapes.filter((shape) => shape.id !== hit.id))
            }
            setSelectedId(null);
            return
        }


        if (tool === "select") {
            setSelectedId(hit?.id ?? null);
            if (!hit) return

            setColorState(hit.color);
            setStrokeWidthState(hit.strokeWidth)

            gesture.current = {
                pointerId: event.pointerId,
                mode: "move",
                start: point,
                shape: hit,
                base: shapes,
                latest: shapes,
            };
        } else {
            if (shapes.length >= 1000) {
                setNotice("This board is 1000 shape limit")
                return
            }

            setSelectedId(null);

            const shape: Shape = {
                id: crypto.randomUUID(),
                kind: tool,
                x: point.x,
                y: point.y,
                width: 0,
                height: 0,
                color,
                strokeWidth,
                points: tool === "pen" ? [{x: 0, y: 0}]: [],
            }


            const next = [...shapes,shape]

            gesture.current = {
                pointerId:event.pointerId,
                mode: 'draw',
                start: point,
                shape,
                base:shapes,
                latest: next,
            }

            setPreview(next)
        }

        event.currentTarget.setPointerCapture(event.pointerId)
    }

   function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
        const active = gesture.current;

        if (!active || active.pointerId !== event.pointerId) return

        const point = getPoint(event);
        if (!point) return;

        const dx = point.x - active.start.x;
        const dy = point.y - active.start.y;

        if (active.mode === "move") {
            const moved: Shape = {
                ...active.shape,
                x: active.shape.x + dx,
                y: active.shape.y + dy,
            }

            active.latest = active.base.map((shape) =>
                shape.id === moved.id ? moved : shape
            )
        } else {
            let updated: Shape;

            if (active.shape.kind === "pen") {
                const points = active.shape.points;
                const last = points[points.length -1];

                const shouldAdd = points.length < 5000 && Math.hypot(dx- last.x , dy- last.y) >= 1 

                updated = {
                    ...active.shape,
                    points: shouldAdd ? [...points, { x: dx, y: dy}]: points,
                };
            } else {
                updated = {
                    ...active.shape,
                    width: dx,
                    height: dy,
                }
            }

            active.shape = updated;
            active.latest = [...active.base, updated]
        }
        setPreview(active.latest)
   }


   function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const active = gesture.current;

    if (!active || active.pointerId !== event.pointerId) return

    onPointerMove(event);

    gesture.current =null;

    setPreview(null)

    // thats what shee said :(
    const tooSmall = active.mode === "draw" && active.shape.kind !== "pen" && Math.abs(active.shape.width)+ Math.abs(active.shape.height) < 2;

    if (!tooSmall) commit(active.latest)
   }

   function onKeyDown(event: ReactKeyboardEvent<SVGSVGElement>) {
    const key = event.key.toLowerCase();
    const command = event.ctrlKey || event.metaKey;

    if (command &&  key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return
    }

    if (command && key === "y") {
        event.preventDefault();
        redo();
        return
    }

    if (command || event.altKey) return;

    if (event.key === "Escape") {
        cancelGesture();
        setSelectedId(null)
        setTool("select")
        return
    }

    if (
        (event.key === "Delete" || event.key === "Backspace") && selectedId
    ) {
        event.preventDefault()
        commit(shapes.filter((shape) => shape.id !== selectedId))
        setSelectedId(null);
        return
    }

    const shortcuts: Record<string, Tool> = {
        v: "select",
        p: 'pen',
        r: "rectangle",
        o: "ellipse",
        l: "line",
        e: "erase",
    };
    if (shortcuts[key]) {
        event.preventDefault();
        cancelGesture();
        setSelectedId(null)
        setTool(shortcuts[key])
    }
   }


   function loadDocument(raw: string) {
    try {
        const parsed = documentSchema.safeParse(JSON.parse(raw));

        if (!parsed.success) {
            throw new Error("Invalid Drawing");
        }

        cancelGesture();
        commit(parsed.data.elements)
        setSelectedId(null)
        setNotice("drawing are back my boii :)")
    } catch  {
        setNotice("that file is not valid bruh")
    }
   }

   return {
    ready,
    shapes,
    elements,
    tool,
    color,
    strokeWidth,
    selectedId,
    notice,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    setTool: (next:Tool) => {
        setTool(next)
        setSelectedId(null)
    },
    changeColor,
    changeStrokeWidth,
    undo,
    redo,
    loadDocument,
    setNotice,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: cancelGesture,
    onKeyDown,
   }
}

