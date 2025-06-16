import logging
from typing import Optional, Dict, List
from uuid import uuid4, UUID

RunID = str | UUID

class Run:
    def __init__(self, run_id: str | None = None, parent_run_id: str | None = None):
        self.id: str = run_id or str(uuid4())
        self.parent_run_id: str | None = parent_run_id
        self.children: List[Run] = []

class RunManager:
    def __init__(self):
        self.runs: Dict[str, Run] = {}
        self._current_run: Run | None = None
        self._run_stack: List[Run] = []  

    @property
    def current_run(self) -> Run | None:
        """Get the currently active run."""
        return self._current_run

    @property
    def current_run_id(self) -> str | None:
        """Safely get the ID of the current run, or None if there is no current run."""
        return self._current_run.id if self._current_run else None

    def start_run(self, run_id: RunID | None = None, parent_run_id: RunID | None = None) -> Run | None:
        if parent_run_id is None and self._current_run is not None:
            parent_run_id = self._current_run.id

        if run_id is not None and run_id == parent_run_id:
            logging.error("A run cannot be its own parent.")
            return None

        if isinstance(run_id, UUID):
            run_id = str(run_id)
        if isinstance(parent_run_id, UUID):
            parent_run_id = str(parent_run_id)

        if not self._run_exists(parent_run_id):
            # in Langchain CallbackHandler, sometimes it pass a parent_run_id for run that do not exist. 
            # Those runs should be ignored by Lunary
            parent_run_id = None

        run = Run(run_id, parent_run_id)
        self.runs[run.id] = run

        if parent_run_id:
            parent_run = self.runs.get(parent_run_id)
            if parent_run:
                parent_run.children.append(run)

        if self._current_run:
            self._run_stack.append(self._current_run)
        self._current_run = run

        return run

    def end_run(self, run_id: RunID) -> str:
        if isinstance(run_id, UUID):
            run_id = str(run_id)

        run = self.runs.get(run_id)
        if run:
            if self._current_run and self._current_run.id == run_id:
                self._current_run = self._run_stack.pop() if self._run_stack else None
            self._delete_run(run)

        return run_id

    def _run_exists(self, run_id: str | None) -> bool:
        if run_id is None:
            return False
        return run_id in self.runs

    def _delete_run(self, run: Run) -> None:
         for child in list(run.children): # iterate over a copy
             self._delete_run(child)

         if run.parent_run_id:
             parent_run = self.runs.get(run.parent_run_id)
             if parent_run and run in parent_run.children:  # membership guard
                 parent_run.children.remove(run)

         self._run_stack = [r for r in self._run_stack if r.id != run.id]
         self.runs.pop(run.id, None)              # safe pop 