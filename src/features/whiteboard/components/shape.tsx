import { Shape } from "../schema";

type Props = {
    shape: Shape;
};

export function ShapeView({shape}: Props) {
    const { width, height, points } = shape;


    const stroke = {
        stroke: shape.color,
        strokeWidth: shape.strokeWidth,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
    }


    const penPoints = points.map((point) => `${point.x}, ${point.y}`).join(" ");


    return(
        <g data-shape-id={shape.id} transform={`translate(${shape.x} ${shape.y})`}>
            {shape.kind === "rectangle" && (
                <rect 
                    x={Math.min(0,width)}
                    y={Math.min(0,height)}
                    width={Math.abs(width)}
                    height={Math.abs(height)}
                    rx={3}
                    fill="transparent"
                    {...stroke}
                />
            )}

            {shape.kind === "ellipse" && (
                <ellipse 
                    cx={width/2}
                    cy={height/2}
                    rx={Math.abs(width)/2}
                    ry={Math.abs(height)/2}
                    fill="transparent"
                    {...stroke}
                />
            )}

            {shape.kind === "line" && (
                <>
                <line 
                    x1={0}
                    y1={0}
                    x2={width}
                    y2={height}
                    stroke="transparent"
                    strokeWidth={Math.max(14,shape.strokeWidth)}
                    pointerEvents="stroke"
                />

                <line 
                    x1={0}
                    y1={0}
                    x2={width}
                    y2={height}
                    {...stroke}
                />
                </>
            )}

            {shape.kind === "pen" &&
                (points.length === 1 ? (
                    <circle 
                        cx={points[0].x}
                        cy={points[0].y}
                        r={shape.strokeWidth/2}
                        fill={shape.color}
                    />
                ): (
                    <>
                        <polyline
                            points={penPoints}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={Math.max(14,shape.strokeWidth)}
                            pointerEvents="stroke"
                        />

                        <polyline
                            points={penPoints}
                            fill="none"
                            {...stroke}
                        />
                    </>
                )
            )}
        </g>
    )
}