# HelloAgent and WordAgent

This beginner-friendly project demonstrates cooperation between two Python
agents. Every document command follows the complete chain:

```text
Command
  -> HelloAgent.Observe()
  -> HelloAgent.Plan()
  -> HelloAgent.Act()
  -> WordAgent.Observe()
  -> WordAgent.Plan()
  -> WordAgent.Act()
  -> result returned to HelloAgent
```

## Install and run

```bash
pip uninstall docx
pip install -r requirements.txt
python main.py
```

## Example session

`main.py` first supplies a tuple of command tuples to `HelloAgent`. The first
item of every command tuple is always the command word:

```python
commands = (
    ("greet",),
    ("time",),
    ("eat",),
    ("create", "champak.docx"),
    ("write", "Hello Champak Roy"),
    ("font", "Arial", 24),
    ("save",),
    ("read", "champak.docx"),
)

results = HelloAgent().Observe(commands)
```

`main.py` gives the tuple directly to `HelloAgent.Observe()`. HelloAgent then
processes every tuple item through its own Observe, Plan and Act
functions. Its Act function transfers Word work to WordAgent, which again uses
Observe, Plan and Act. WordAgent's result is returned to HelloAgent. After all
commands finish, HelloAgent returns a tuple containing one result per command.

Interactive mode then starts, where commands can also be entered one by one:

```text
greet
time
eat
create champak.docx
write Hello Champak Roy
font Arial 24
save
status
exit
```

`HelloAgent` handles these original general commands itself:

```text
greet / hello / hi              Greet Champak Roy
time / show time / show         Display the current time
eat / food / snacks / golgappa  Suggest golgappa
```

These commands do not go to `WordAgent`, because they are not Word jobs.

The result, `champak.docx`, is saved in the same folder as the agents.

Quoted text is supported:

```text
write "Hello Champak Roy"
font "Times New Roman" 14
```

Deletion requires the exact confirmation word `DELETE`.

## Read options

Read the text of a Word file:

```text
read champak.docx
```

Read a tuple of commands from the included `commands.txt` file:

```text
batch commands.txt
```

Command files are parsed with `ast.literal_eval`, not `eval`, and must contain
a tuple of command tuples. Each inner tuple must begin with its command word.
Files are restricted to the application folder.
