from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import data
import powerflow

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