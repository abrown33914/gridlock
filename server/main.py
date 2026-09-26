from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import data
import powerflow
import dependencies

app = FastAPI(title="Gridlock")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "alive"}

@app.get("/nodes")
def get_nodes():
    return data.nodes()

@app.get("/projects")
def get_projects():
    return data.projects()

@app.get("/powerflow")
def get_powerflow():
    return powerflow.solve(data.nodes(), data.projects())

@app.post("/powerflow/whatif")
def powerflow_whatif(added_line: dict):
    lines = data.projects() + [added_line]
    return powerflow.solve(data.nodes(), lines)

@app.get("/dependencies")
def get_dependencies():
    return dependencies.graph_json(data.projects())

@app.post("/dependencies/cascade")
def dependencies_cascade(payload: dict):
    return dependencies.cascade_levels(data.projects(), payload["failed_id"])

@app.post("/powerflow/demand")
def powerflow_demand(payload: dict):
    scale = payload.get("scale", 1.0)
    nodes = [dict(n) for n in data.nodes()]
    for n in nodes:
        if n["load_mw"] < 0:
            n["load_mw"] *= scale
    return powerflow.solve(nodes, data.projects())