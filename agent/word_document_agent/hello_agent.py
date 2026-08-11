"""HelloAgent: receives requests and delegates Word jobs to WordAgent."""

import ast
from datetime import datetime
from pathlib import Path

from word_agent import WordAgent


class HelloAgent:
    """The coordinator agent in the two-agent application."""

    WORD_COMMANDS = {
        "create", "open", "read", "write", "font", "save", "delete", "status"
    }

    def __init__(self):
        self.word_agent = WordAgent()

    def Observe(self, supplied_request=None):
        """OBSERVE: receive commands and begin the complete agent pipeline.

        A tuple represents one ordered series of complete command strings.
        For example::

            ("create test.docx", "write Hello", "save", "read")

        Commands are executed from the first tuple item to the last. A string
        is still accepted as one command for the interactive loop.
        """
        if isinstance(supplied_request, tuple):
            return self._process_commands(supplied_request)

        if supplied_request is None:
            supplied_request = input("\nYou: ")
        if not isinstance(supplied_request, str):
            raise TypeError("HelloAgent.Observe expects text or a command tuple")
        request = supplied_request.strip()
        print(f"HelloAgent observed: {request or '(empty command)'}")
        return request

    def Plan(self, request):
        """PLAN: decide whether to answer or delegate."""
        if not request:
            return "empty"

        command = request.split(maxsplit=1)[0].lower()
        if command in {"create", "open", "read", "write", "font", "save", "delete", "status"}:
            return "transfer_to_word_agent"
        if command in {"batch", "commands"}:
            return "read_command_file"
        if command in {"hello", "hi", "greet"}:
            return "greet"
        if command in {"show", "time", "show_time", "show time"}:
            return "show_time"
        if command in {"eat", "food", "snack", "snacks", "golgappa"}:
            return "eat"
        if command in {"help", "commands"}:
            return "help"
        if command in {"exit", "quit", "stop"}:
            return "exit"
        return "unknown"

    def Act(self, action, request, return_result=False):
        """ACT: perform a simple action or transfer the job."""
        if action == "transfer_to_word_agent":
            print("HelloAgent: This is a Word job.")
            print("HelloAgent -> WordAgent: Transferring request...")
            observed_job = self.word_agent.Observe(request)
            word_action, arguments = self.word_agent.Plan(observed_job)
            result = self.word_agent.Act(word_action, arguments)
            print(f"WordAgent acted: {result}")
            print(f"WordAgent -> HelloAgent: {result}")
            return result if return_result else True

        if action == "read_command_file":
            filename = request.split(maxsplit=1)[1] if isinstance(request, str) and " " in request else "commands.txt"
            try:
                commands = self.read_commands(filename)
            except (OSError, SyntaxError, ValueError) as error:
                print(f"HelloAgent: Could not read command file: {error}")
                return True
            self.transfer_commands(commands)
            return True

        if action == "greet":
            result = "Hello Champak Roy! How may I help you?"
            print(f"HelloAgent: {result}")
            return result if return_result else True

        if action == "show_time":
            result = f"Current time: {datetime.now().strftime('%I:%M %p')}"
            print(f"HelloAgent: {result}")
            return result if return_result else True

        if action == "eat":
            result = "Golgappa daba ke kha lo"
            print(f"HelloAgent: {result}")
            return result if return_result else True

        if action == "help":
            self.show_help()
            return True

        if action == "empty":
            print("HelloAgent: Please enter a command.")
            return True

        if action == "unknown":
            print("HelloAgent: I do not understand. Type help to see commands.")
            return True

        if self.word_agent.has_unsaved_changes():
            answer = input("HelloAgent: Unsaved changes exist. Type YES to exit: ")
            if answer.strip().lower() != "yes":
                print("HelloAgent: Exit cancelled.")
                return True
        print("HelloAgent: Program over.")
        return False

    @staticmethod
    def show_help():
        print("""
TWO-AGENT COMMANDS
  hello                         Greet the user
  time                          Show the current time
  eat                           Suggest golgappa
  food / snacks                 Other names for the eat command
  create champak.docx           Create a document
  write Hello Champak Roy       Add a paragraph
  font Arial 24                 Change all text to Arial, 24 pt
  save                          Save the current document
  save another.docx             Save with another name
  open champak.docx             Open a document
  read champak.docx             Return the text stored in a document
  batch commands.txt            Read and execute a tuple of commands
  delete champak.docx           Delete after confirmation
  status                        Show current document status
  exit                          Close the application
""")

    def read_commands(self, filename="commands.txt"):
        """Read a safe Python tuple literal from a same-folder text file."""
        path = Path(__file__).resolve().parent / Path(filename).name
        commands = ast.literal_eval(path.read_text(encoding="utf-8"))
        if not isinstance(commands, tuple) or not all(isinstance(item, str) for item in commands):
            raise ValueError("The file must contain a tuple of command strings.")
        return commands

    def _process_commands(self, commands):
        """Process a tuple received by Observe and return a result tuple."""
        results = []
        print(f"HelloAgent.Observe received a tuple containing {len(commands)} commands.")
        for request in commands:
            if not isinstance(request, str) or not request.strip():
                results.append(f"{request!r} -> Invalid command")
                continue

            print("\n" + "-" * 62)
            print(f"Input supplied to HelloAgent.Observe(): {request}")
            observed_request = self.Observe(request)
            action = self.Plan(observed_request)
            print(f"HelloAgent planned: {action}")
            result = self.Act(action, observed_request, return_result=True)
            results.append((request, result))

        print("\nWordAgent -> HelloAgent: Result tuple returned")
        return tuple(results)

    def run(self):
        print("=" * 62)
        print("HELLO AGENT + WORD AGENT")
        print("HelloAgent receives commands and transfers Word jobs.")
        print("Type help to see examples.")
        print("=" * 62)

        running = True
        while running:
            request = self.Observe()
            action = self.Plan(request)
            print(f"HelloAgent planned: {action}")
            running = self.Act(action, request)
