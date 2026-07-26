import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MonacoCodeEditor, { DEFAULT_CODE_TEMPLATES } from "@/components/MonacoCodeEditor";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Code templates for quick start
const CODE_TEMPLATES = {
  javascript: {
    "Hello World": 'console.log("Hello, World!");',
    "Array Operations": 'const arr = [1, 2, 3, 4, 5];\nconst doubled = arr.map(x => x * 2);\nconst filtered = arr.filter(x => x > 2);\nconst sum = arr.reduce((acc, x) => acc + x, 0);\nconsole.log({ doubled, filtered, sum });',
    "Async/Await": 'async function fetchData() {\n  try {\n    const response = await fetch("https://api.example.com/data");\n    const data = await response.json();\n    console.log(data);\n  } catch (error) {\n    console.error("Error:", error);\n  }\n}\n\nfetchData();',
    "Sorting Algorithm": 'function bubbleSort(arr) {\n  const n = arr.length;\n  for (let i = 0; i < n - 1; i++) {\n    for (let j = 0; j < n - i - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];\n      }\n    }\n  }\n  return arr;\n}\n\nconsole.log(bubbleSort([64, 34, 25, 12, 22]));',
    "Promise Example": 'const promise = new Promise((resolve, reject) => {\n  setTimeout(() => {\n    const success = true;\n    if (success) {\n      resolve("Operation successful!");\n    } else {\n      reject("Operation failed!");\n    }\n  }, 1000);\n});\n\npromise\n  .then(result => console.log(result))\n  .catch(error => console.error(error));',
    "Object Destructuring": 'const person = {\n  name: "John",\n  age: 30,\n  city: "New York",\n  country: "USA"\n};\n\nconst { name, age, ...rest } = person;\nconsole.log(name, age, rest);',
    "Arrow Functions": 'const numbers = [1, 2, 3, 4, 5];\n\n// Traditional function\nconst square1 = numbers.map(function(x) { return x * x; });\n\n// Arrow function\nconst square2 = numbers.map(x => x * x);\n\nconsole.log(square1, square2);',
    "Class Example": 'class Rectangle {\n  constructor(width, height) {\n    this.width = width;\n    this.height = height;\n  }\n\n  get area() {\n    return this.width * this.height;\n  }\n\n  get perimeter() {\n    return 2 * (this.width + this.height);\n  }\n}\n\nconst rect = new Rectangle(10, 5);\nconsole.log(`Area: ${rect.area}, Perimeter: ${rect.perimeter}`);',
  },
  python: {
    "Hello World": 'print("Hello, World!")',
    "List Comprehension": 'numbers = [1, 2, 3, 4, 5]\nsquared = [x**2 for x in numbers]\neven = [x for x in numbers if x % 2 == 0]\nprint(f"Squared: {squared}")\nprint(f"Even: {even}")',
    "File Operations": '# Reading a file\ntry:\n    with open("input.txt", "r") as file:\n        content = file.read()\n        print(content)\nexcept FileNotFoundError:\n    print("File not found")\n\n# Writing to a file\nwith open("output.txt", "w") as file:\n    file.write("Hello, World!")',
    "Class Example": 'class Person:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n    \n    def greet(self):\n        return f"Hello, I\'m {self.name} and I\'m {self.age} years old"\n    \n    def birthday(self):\n        self.age += 1\n        return f"Happy birthday! Now {self.age} years old"\n\nperson = Person("Alice", 25)\nprint(person.greet())\nprint(person.birthday())',
    "Dictionary Operations": 'student = {\n    "name": "John",\n    "age": 20,\n    "grades": [85, 90, 92]\n}\n\n# Accessing values\nprint(f"Name: {student[\'name\']}")\nprint(f"Average: {sum(student[\'grades\']) / len(student[\'grades\'])}")\n\n# Adding new key\nstudent["email"] = "john@example.com"\nprint(student)',
    "Lambda Functions": 'numbers = [1, 2, 3, 4, 5]\n\n# Using lambda with map\nsquared = list(map(lambda x: x**2, numbers))\n\n# Using lambda with filter\neven = list(filter(lambda x: x % 2 == 0, numbers))\n\n# Using lambda with sorted\nwords = ["apple", "pie", "zoo", "cat"]\nsorted_words = sorted(words, key=lambda x: len(x))\n\nprint(squared, even, sorted_words)',
    "Exception Handling": 'def divide(a, b):\n    try:\n        result = a / b\n        return result\n    except ZeroDivisionError:\n        return "Cannot divide by zero"\n    except TypeError:\n        return "Invalid input types"\n    finally:\n        print("Division operation completed")\n\nprint(divide(10, 2))\nprint(divide(10, 0))',
    "Decorators": 'def timer_decorator(func):\n    import time\n    def wrapper(*args, **kwargs):\n        start = time.time()\n        result = func(*args, **kwargs)\n        end = time.time()\n        print(f"{func.__name__} took {end - start:.4f} seconds")\n        return result\n    return wrapper\n\n@timer_decorator\ndef slow_function():\n    import time\n    time.sleep(1)\n    return "Done!"\n\nprint(slow_function())',
  },
  java: {
    "Hello World": 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    "Array Operations": 'import java.util.Arrays;\n\npublic class Main {\n    public static void main(String[] args) {\n        int[] arr = {1, 2, 3, 4, 5};\n        System.out.println("Original: " + Arrays.toString(arr));\n        \n        // Sum of array\n        int sum = Arrays.stream(arr).sum();\n        System.out.println("Sum: " + sum);\n        \n        // Max value\n        int max = Arrays.stream(arr).max().getAsInt();\n        System.out.println("Max: " + max);\n    }\n}',
    "Class Example": 'public class Person {\n    private String name;\n    private int age;\n    \n    public Person(String name, int age) {\n        this.name = name;\n        this.age = age;\n    }\n    \n    public String greet() {\n        return "Hello, I\'m " + name + " and I\'m " + age + " years old";\n    }\n    \n    public static void main(String[] args) {\n        Person person = new Person("Alice", 25);\n        System.out.println(person.greet());\n    }\n}',
    "ArrayList Example": 'import java.util.ArrayList;\nimport java.util.Collections;\n\npublic class Main {\n    public static void main(String[] args) {\n        ArrayList<Integer> numbers = new ArrayList<>();\n        numbers.add(5);\n        numbers.add(2);\n        numbers.add(8);\n        numbers.add(1);\n        \n        System.out.println("Original: " + numbers);\n        Collections.sort(numbers);\n        System.out.println("Sorted: " + numbers);\n    }\n}',
    "Exception Handling": 'public class Main {\n    public static void main(String[] args) {\n        try {\n            int result = divide(10, 0);\n            System.out.println("Result: " + result);\n        } catch (ArithmeticException e) {\n            System.out.println("Error: " + e.getMessage());\n        } finally {\n            System.out.println("Operation completed");\n        }\n    }\n    \n    public static int divide(int a, int b) {\n        return a / b;\n    }\n}',
    "Interface Example": 'interface Animal {\n    void makeSound();\n    void eat();\n}\n\nclass Dog implements Animal {\n    public void makeSound() {\n        System.out.println("Woof!");\n    }\n    \n    public void eat() {\n        System.out.println("Dog is eating");\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Animal dog = new Dog();\n        dog.makeSound();\n        dog.eat();\n    }\n}',
  },
  typescript: {
    "Hello World": 'const message: string = "Hello, World!";\nconsole.log(message);',
    "Interface Example": 'interface User {\n  id: number;\n  name: string;\n  email: string;\n  age?: number;\n}\n\nconst user: User = {\n  id: 1,\n  name: "John Doe",\n  email: "john@example.com"\n};\n\nconsole.log(user);',
    "Generic Function": 'function identity<T>(arg: T): T {\n  return arg;\n}\n\nconst num = identity<number>(42);\nconst str = identity<string>("Hello");\n\nconsole.log(num, str);',
    "Class with Types": 'class Calculator {\n  add(a: number, b: number): number {\n    return a + b;\n  }\n  \n  subtract(a: number, b: number): number {\n    return a - b;\n  }\n  \n  multiply(a: number, b: number): number {\n    return a * b;\n  }\n}\n\nconst calc = new Calculator();\nconsole.log(calc.add(5, 3));',
    "Enum Example": 'enum Color {\n  Red = "RED",\n  Green = "GREEN",\n  Blue = "BLUE"\n}\n\nfunction getColorMessage(color: Color): string {\n  switch(color) {\n    case Color.Red:\n      return "Stop!";\n    case Color.Green:\n      return "Go!";\n    case Color.Blue:\n      return "Caution!";\n  }\n}\n\nconsole.log(getColorMessage(Color.Red));',
    "Type Guards": 'type Fish = { swim: () => void };\ntype Bird = { fly: () => void };\n\nfunction isFish(pet: Fish | Bird): pet is Fish {\n  return (pet as Fish).swim !== undefined;\n}\n\nfunction move(pet: Fish | Bird) {\n  if (isFish(pet)) {\n    pet.swim();\n  } else {\n    pet.fly();\n  }\n}',
  },
  "c++": {
    "Hello World": '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
    "Vector Operations": '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    vector<int> nums = {5, 2, 8, 1, 9};\n    \n    // Sort\n    sort(nums.begin(), nums.end());\n    \n    // Print\n    for(int num : nums) {\n        cout << num << " ";\n    }\n    \n    return 0;\n}',
    "Class Example": '#include <iostream>\n#include <string>\nusing namespace std;\n\nclass Person {\nprivate:\n    string name;\n    int age;\n    \npublic:\n    Person(string n, int a) : name(n), age(a) {}\n    \n    void greet() {\n        cout << "Hello, I\'m " << name << " and I\'m " << age << " years old" << endl;\n    }\n};\n\nint main() {\n    Person person("Alice", 25);\n    person.greet();\n    return 0;\n}',
    "Pointers": '#include <iostream>\nusing namespace std;\n\nint main() {\n    int x = 10;\n    int* ptr = &x;\n    \n    cout << "Value: " << x << endl;\n    cout << "Address: " << &x << endl;\n    cout << "Pointer: " << ptr << endl;\n    cout << "Dereferenced: " << *ptr << endl;\n    \n    return 0;\n}',
  },
  go: {
    "Hello World": 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    "Slice Operations": 'package main\n\nimport "fmt"\n\nfunc main() {\n    numbers := []int{1, 2, 3, 4, 5}\n    \n    // Append\n    numbers = append(numbers, 6)\n    \n    // Slice\n    subset := numbers[1:4]\n    \n    fmt.Println("Numbers:", numbers)\n    fmt.Println("Subset:", subset)\n}',
    "Struct Example": 'package main\n\nimport "fmt"\n\ntype Person struct {\n    Name string\n    Age  int\n}\n\nfunc (p Person) Greet() string {\n    return fmt.Sprintf("Hello, I\'m %s and I\'m %d years old", p.Name, p.Age)\n}\n\nfunc main() {\n    person := Person{Name: "Alice", Age: 25}\n    fmt.Println(person.Greet())\n}',
    "Goroutines": 'package main\n\nimport (\n    "fmt"\n    "time"\n)\n\nfunc sayHello(name string) {\n    for i := 0; i < 3; i++ {\n        fmt.Printf("Hello %s!\\n", name)\n        time.Sleep(100 * time.Millisecond)\n    }\n}\n\nfunc main() {\n    go sayHello("Alice")\n    go sayHello("Bob")\n    time.Sleep(1 * time.Second)\n}',
  },
  rust: {
    "Hello World": 'fn main() {\n    println!("Hello, World!");\n}',
    "Vector Operations": 'fn main() {\n    let mut numbers = vec![1, 2, 3, 4, 5];\n    \n    // Add element\n    numbers.push(6);\n    \n    // Iterate\n    for num in &numbers {\n        println!("{}", num);\n    }\n    \n    // Map\n    let squared: Vec<i32> = numbers.iter().map(|x| x * x).collect();\n    println!("{:?}", squared);\n}',
    "Struct Example": 'struct Person {\n    name: String,\n    age: u32,\n}\n\nimpl Person {\n    fn greet(&self) -> String {\n        format!("Hello, I\'m {} and I\'m {} years old", self.name, self.age)\n    }\n}\n\nfn main() {\n    let person = Person {\n        name: String::from("Alice"),\n        age: 25,\n    };\n    println!("{}", person.greet());\n}',
    "Option Example": 'fn divide(a: f64, b: f64) -> Option<f64> {\n    if b == 0.0 {\n        None\n    } else {\n        Some(a / b)\n    }\n}\n\nfn main() {\n    match divide(10.0, 2.0) {\n        Some(result) => println!("Result: {}", result),\n        None => println!("Cannot divide by zero"),\n    }\n}',
  },
  ruby: {
    "Hello World": 'puts "Hello, World!"',
    "Array Operations": 'numbers = [1, 2, 3, 4, 5]\n\n# Map\nsquared = numbers.map { |x| x ** 2 }\n\n# Select (filter)\neven = numbers.select { |x| x.even? }\n\n# Reduce\nsum = numbers.reduce(0) { |acc, x| acc + x }\n\nputs "Squared: #{squared}"\nputs "Even: #{even}"\nputs "Sum: #{sum}"',
    "Class Example": 'class Person\n  attr_accessor :name, :age\n  \n  def initialize(name, age)\n    @name = name\n    @age = age\n  end\n  \n  def greet\n    "Hello, I\'m #{@name} and I\'m #{@age} years old"\n  end\nend\n\nperson = Person.new("Alice", 25)\nputs person.greet',
    "Hash Operations": 'person = {\n  name: "John",\n  age: 30,\n  city: "New York"\n}\n\nputs "Name: #{person[:name]}"\nputs "Age: #{person[:age]}"\n\n# Add new key\nperson[:email] = "john@example.com"\nputs person',
  },
  php: {
    "Hello World": '<?php\necho "Hello, World!";\n?>',
    "Array Operations": '<?php\n$numbers = [1, 2, 3, 4, 5];\n\n// Map\n$squared = array_map(function($x) { return $x * $x; }, $numbers);\n\n// Filter\n$even = array_filter($numbers, function($x) { return $x % 2 == 0; });\n\n// Sum\n$sum = array_sum($numbers);\n\nprint_r($squared);\nprint_r($even);\necho "Sum: $sum";\n?>',
    "Class Example": '<?php\nclass Person {\n    private $name;\n    private $age;\n    \n    public function __construct($name, $age) {\n        $this->name = $name;\n        $this->age = $age;\n    }\n    \n    public function greet() {\n        return "Hello, I\'m {$this->name} and I\'m {$this->age} years old";\n    }\n}\n\n$person = new Person("Alice", 25);\necho $person->greet();\n?>',
  },
  sql: {
    "Select Query": 'SELECT * FROM users\nWHERE age > 18\nORDER BY name ASC\nLIMIT 10;',
    "Join Query": 'SELECT u.name, o.order_date, o.total\nFROM users u\nINNER JOIN orders o ON u.id = o.user_id\nWHERE o.total > 100\nORDER BY o.order_date DESC;',
    "Insert Data": 'INSERT INTO users (name, email, age)\nVALUES \n  (\'John Doe\', \'john@example.com\', 30),\n  (\'Jane Smith\', \'jane@example.com\', 25);',
    "Update Data": 'UPDATE users\nSET age = age + 1,\n    updated_at = CURRENT_TIMESTAMP\nWHERE id = 1;',
    "Create Table": 'CREATE TABLE users (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(100) NOT NULL,\n  email VARCHAR(100) UNIQUE NOT NULL,\n  age INT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);',
    "Aggregate Functions": 'SELECT \n  COUNT(*) as total_users,\n  AVG(age) as average_age,\n  MIN(age) as youngest,\n  MAX(age) as oldest\nFROM users\nWHERE active = 1;',
  },
};


// Define the form schema for code generation
const codeGenerationSchema = z.object({
  problem: z.string().min(10, "Please describe your problem in more detail"),
  language: z.enum([
    "python", 
    "javascript", 
    "java", 
    "c++", 
    "typescript",
    "go",
    "rust",
    "ruby",
    "php",
    "swift",
    "kotlin",
    "c#",
    "r",
    "sql"
  ]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  context: z.string().optional(),
  tags: z.array(z.string()).optional(),
  generateMultiple: z.boolean().optional(),
  optimizeCode: z.boolean().optional(),
});

type CodeGenerationFormValues = z.infer<typeof codeGenerationSchema>;

interface CodeGenerationResponse {
  codeSnippet: {
    id: number;
    title: string;
    code: string;
    problem: string;
    language: string;
    explanation: string;
  };
  message: string;
}

interface CodeSnippet {
  id: number;
  title: string;
  code: string;
  problem: string;
  language: string;
  explanation: string;
  tags?: string[] | null;
  createdAt?: Date;
}

const detectLanguage = (code: string): string | null => {
  if (/^\s*#include\s+<(iostream|stdio\.h)>/m.test(code)) return "c++";
  if (/public\s+class\s+\w+\s*\{|public\s+static\s+void\s+main/m.test(code)) return "java";
  if (/^\s*def\s+\w+\s*\(|^\s*print\(|^\s*import\s+(sys|os|math|numpy)/m.test(code)) return "python";
  if (/console\.log\(|^\s*const\s+\w+\s*=\s*(require|document|window)/m.test(code)) return "javascript";
  if (/^\s*package\s+main|^\s*func\s+main\(\)/m.test(code)) return "go";
  if (/^\s*fn\s+main\(\)/m.test(code)) return "rust";
  if (/^\s*<\?php/m.test(code)) return "php";
  if (/^\s*using\s+System;|namespace\s+\w+/m.test(code)) return "c#";
  return null;
};

const MarkdownText = ({ text, className = "" }: { text: string; className?: string }) => {
  if (!text) return null;
  
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[0.9em] font-mono">$1</code>');
  html = html.replace(/\n/g, '<br />');

  return (
    <div 
      className={className} 
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
};

export default function CodeGenerator() {
  const { toast } = useToast();
  // Persist active tab across page refreshes
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('codeGenActiveTab') || "generator";
  });
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [editableCode, setEditableCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studyforge_editable_code');
      if (saved) return saved;
    }
    return "";
  });
  const [codeStdin, setCodeStdin] = useState<string>("");
  const [codeOutput, setCodeOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");
  
  // Playground state
  const [playgroundCode, setPlaygroundCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studyforge_playground_code');
      if (saved) return saved;
    }
    return "";
  });
  const [playgroundLanguage, setPlaygroundLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studyforge_playground_language');
      if (saved) return saved;
    }
    return "javascript";
  });
  const isInitialMount = useRef(true);

  // Auto-language detection logic
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (!playgroundCode.trim()) return;

      let detectedLang = detectLanguage(playgroundCode);

      if (detectedLang && detectedLang !== playgroundLanguage) {
        setPlaygroundLanguage(detectedLang);
        toast({
          title: "Language Auto-Detected 🪄",
          description: `Switched to ${detectedLang === "c++" ? "C/C++" : detectedLang.charAt(0).toUpperCase() + detectedLang.slice(1)} based on your code.`,
        });
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [playgroundCode, playgroundLanguage, toast]);

  const [playgroundStdin, setPlaygroundStdin] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studyforge_playground_stdin');
      if (saved) return saved;
    }
    return "";
  });
  
  // Save state to localStorage to prevent data loss on refresh
  useEffect(() => {
    localStorage.setItem('studyforge_editable_code', editableCode);
  }, [editableCode]);

  useEffect(() => {
    localStorage.setItem('studyforge_playground_code', playgroundCode);
  }, [playgroundCode]);

  useEffect(() => {
    localStorage.setItem('studyforge_playground_language', playgroundLanguage);
  }, [playgroundLanguage]);

  useEffect(() => {
    localStorage.setItem('studyforge_playground_stdin', playgroundStdin);
  }, [playgroundStdin]);

  const [playgroundOutput, setPlaygroundOutput] = useState<string>("");
  const [isPlaygroundRunning, setIsPlaygroundRunning] = useState(false);
  
  // New features state
  const [showTemplates, setShowTemplates] = useState(false);
  const [showComplexity, setShowComplexity] = useState(false);
  const [codeComplexity, setCodeComplexity] = useState<string>("");
  
  // CRUD state
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSnippetId, setDeletingSnippetId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  
  // Save active tab to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('codeGenActiveTab', activeTab);
  }, [activeTab]);
  
  const form = useForm<CodeGenerationFormValues>({
    resolver: zodResolver(codeGenerationSchema),
    defaultValues: {
      problem: "",
      language: "javascript",
      difficulty: "medium",
      context: "",
    },
  });

  const handleRefine = () => {
    if (!refinePrompt.trim() || !editableCode) return;
    
    // We append the refinement to the original problem or just use it as the new problem with context
    const currentProblem = form.getValues("problem");
    const newProblem = `Original request: ${currentProblem}\n\nRefinement: ${refinePrompt}`;
    
    form.setValue("problem", newProblem);
    form.setValue("context", editableCode);
    
    // Trigger generation
    const values = form.getValues();
    onSubmit(values);
    setRefinePrompt("");
  };

  interface CodeSnippetsResponse {
    snippets: CodeSnippet[];
    message: string;
  }

  // Get previously generated code snippets with filters
  const { data: snippets, isLoading: isLoadingSnippets } = useQuery<CodeSnippetsResponse>({
    queryKey: ["/api/code-snippets", selectedLanguageFilter, selectedTagFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLanguageFilter !== 'all') {
        params.append('language', selectedLanguageFilter);
      }
      if (selectedTagFilter !== 'all') {
        params.append('tag', selectedTagFilter);
      }
      const queryString = params.toString();
      const url = `/api/code-snippets${queryString ? `?${queryString}` : ''}`;
      return apiRequest(url);
    },
    meta: {
      errorMessage: "Failed to fetch your code snippets"
    }
  });
  
  // Get available tags
  const { data: tagsData } = useQuery<{ tags: string[] }>({
    queryKey: ["/api/code-snippets/tags"],
    meta: {
      errorMessage: "Failed to fetch tags"
    }
  });

  // Mutation for generating code
  const { mutate: generateCode, isPending } = useMutation({
    mutationFn: (data: CodeGenerationFormValues) => 
      apiRequest('/api/code-generator', {
        method: 'POST',
        data,
      }),
    onSuccess: (data) => {
      toast({
        title: "Code generated successfully",
        description: "Your code solution is ready!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/code-snippets"] });
      // Stay on generator tab to show the result in the right panel
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to generate code",
        description: error.message || "Please try again later",
      });
    },
  });

  // Mutation for updating code snippet
  const { mutate: updateSnippet, isPending: isUpdating } = useMutation({
    mutationFn: (data: { id: number; updates: Partial<CodeSnippet> }) => 
      apiRequest(`/api/code-snippets/${data.id}`, {
        method: 'PUT',
        data: data.updates,
      }),
    onSuccess: () => {
      toast({
        title: "Updated successfully",
        description: "Code snippet has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/code-snippets"] });
      setShowEditDialog(false);
      setEditingSnippet(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: error.message || "Please try again later",
      });
    },
  });

  // Mutation for deleting code snippet
  const { mutate: deleteSnippet, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/code-snippets/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast({
        title: "Deleted successfully",
        description: "Code snippet has been deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/code-snippets"] });
      setShowDeleteDialog(false);
      setDeletingSnippetId(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: error.message || "Please try again later",
      });
    },
  });

  function onSubmit(data: CodeGenerationFormValues) {
    generateCode(data);
  }

  // Handle edit snippet
  const handleEditSnippet = (snippet: CodeSnippet) => {
    setEditingSnippet(snippet);
    setShowEditDialog(true);
  };

  // Handle delete snippet
  const handleDeleteSnippet = (id: number) => {
    setDeletingSnippetId(id);
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (deletingSnippetId) {
      deleteSnippet(deletingSnippetId);
    }
  };

  // Download code as file
  const downloadCode = (code: string, language: string, filename: string) => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      'c++': 'cpp',
      'c#': 'cs',
      go: 'go',
      rust: 'rs',
      ruby: 'rb',
      php: 'php',
      swift: 'swift',
      kotlin: 'kt',
      r: 'r',
      sql: 'sql',
    };
    
    const ext = extensions[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: `Code saved as ${filename}.${ext}`,
    });
  };

  // Load template
  const loadTemplate = (template: string) => {
    const templates = CODE_TEMPLATES[playgroundLanguage as keyof typeof CODE_TEMPLATES];
    if (templates && templates[template as keyof typeof templates]) {
      setPlaygroundCode(templates[template as keyof typeof templates]);
      setShowTemplates(false);
      toast({
        title: "Template loaded",
        description: `${template} template loaded successfully`,
      });
    }
  };

  // Analyze code complexity
  const analyzeComplexity = async (code: string) => {
    if (!code) return;
    
    setCodeComplexity("Analyzing...");
    setShowComplexity(true);
    
    try {
      const data = await apiRequest('/api/code-generator/analyze', {
        method: 'POST',
        data: { code },
      });
      setCodeComplexity(data.complexity);
    } catch (error) {
      console.error("Error analyzing complexity:", error);
      setCodeComplexity("Failed to analyze complexity");
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze code complexity. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get the latest generated snippet
  const latestSnippet = snippets?.snippets?.[0];

  // Update editable code when new snippet is generated
  useEffect(() => {
    if (latestSnippet?.code) {
      setEditableCode(latestSnippet.code);
      setCodeOutput(""); // Clear previous output
    }
  }, [latestSnippet]);

  // Function to run code
  const runCode = async () => {
    if (!editableCode.trim()) {
      toast({
        variant: "destructive",
        title: "No code to run",
        description: "Please generate or write some code first",
      });
      return;
    }

    if (!latestSnippet?.language) {
      toast({
        variant: "destructive",
        title: "Language not specified",
        description: "Please generate code first to set the language",
      });
      return;
    }

    setIsRunning(true);
    setCodeOutput("Running code...");

    try {
      const response = await apiRequest('/api/code-executor', {
        method: 'POST',
        data: {
          code: editableCode,
          language: latestSnippet.language,
          stdin: codeStdin,
        },
      });

      let finalOutput = response.output || "Code executed successfully with no output";
      
      if (!codeStdin.trim() && (finalOutput.includes("NoSuchElementException") || finalOutput.includes("EOFError"))) {
        finalOutput = "💡 Oops! Your code crashed because it was expecting an input, but the 'Standard Input (stdin)' box is empty.\n👉 Please type your input in the box above and click Run Code again.\n\n" + "-".repeat(40) + "\n\n" + finalOutput;
      }
      
      setCodeOutput(finalOutput);
    } catch (error: any) {
      let errorMessage = error.response?.output || error.message || "Failed to execute code";
      if (errorMessage.includes("Daily limit reached")) {
        errorMessage = "You have reached your daily code execution limit. Please try again tomorrow to continue running code.";
        setCodeOutput(`⚠️ Limit Reached:\n${errorMessage}`);
        toast({
          variant: "destructive",
          title: "Daily Limit Reached",
          description: errorMessage,
          duration: 4000,
        });
      } else {
        setCodeOutput(`Error: ${errorMessage}`);
        toast({
          variant: "destructive",
          title: "Execution failed",
          description: errorMessage,
          duration: 4000,
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Handle manual language change
  const handleLanguageChange = (lang: string) => {
    setPlaygroundLanguage(lang);
    if (DEFAULT_CODE_TEMPLATES[lang]) {
      setPlaygroundCode(DEFAULT_CODE_TEMPLATES[lang]);
    }
  };

  // Function to run playground code
  const runPlaygroundCode = async () => {
    if (!playgroundCode.trim()) {
      toast({
        variant: "destructive",
        title: "No code to run",
        description: "Please write some code first",
      });
      return;
    }

    setIsPlaygroundRunning(true);
    setPlaygroundOutput("Running code...");

    const actualLanguage = detectLanguage(playgroundCode) || playgroundLanguage;
    
    // Force the editor to switch to the detected language immediately so linting/squiggles update
    if (actualLanguage !== playgroundLanguage) {
      setPlaygroundLanguage(actualLanguage);
    }

    try {
      const response = await apiRequest('/api/code-executor', {
        method: 'POST',
        data: {
          code: playgroundCode,
          language: actualLanguage,
          stdin: playgroundStdin,
        },
      });

      let finalOutput = response.output || "Code executed successfully with no output";
      
      if (!playgroundStdin.trim() && (finalOutput.includes("NoSuchElementException") || finalOutput.includes("EOFError"))) {
        finalOutput = "💡 Oops! Your code crashed because it was expecting an input, but the 'Standard Input (stdin)' box is empty.\n👉 Please type your input in the box above and click Run Code again.\n\n" + "-".repeat(40) + "\n\n" + finalOutput;
      }

      setPlaygroundOutput(finalOutput);
    } catch (error: any) {
      let errorMessage = error.response?.output || error.message || "Failed to execute code";
      if (errorMessage.includes("Daily limit reached")) {
        errorMessage = "You have reached your daily code execution limit. Please try again tomorrow to continue running code.";
        setPlaygroundOutput(`⚠️ Limit Reached:\n${errorMessage}`);
        toast({
          variant: "destructive",
          title: "Daily Limit Reached",
          description: errorMessage,
          duration: 4000,
        });
      } else {
        setPlaygroundOutput(`Error: ${errorMessage}`);
        toast({
          variant: "destructive",
          title: "Execution failed",
          description: errorMessage,
          duration: 4000,
        });
      }
    } finally {
      setIsPlaygroundRunning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 max-w-7xl space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
              <Icons.code className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent truncate">
                AI Code Generator
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                Transform your ideas into production-ready code with AI assistance
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-full sm:max-w-2xl grid-cols-3 h-10 sm:h-11">
            <TabsTrigger value="generator" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Icons.sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Generate</span>
              <span className="xs:hidden">Gen</span>
            </TabsTrigger>
            <TabsTrigger value="playground" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Icons.code className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Playground</span>
              <span className="xs:hidden">Play</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Icons.clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Saved</span>
              <span className="xs:hidden">Save</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generator" className="mt-4 sm:mt-6 md:mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
              {/* Code Generation Form - Left Panel */}
              <Card className="lg:col-span-2 border-2 shadow-lg overflow-hidden group">
                <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
                <CardHeader className="space-y-1 pb-3 sm:pb-4 px-4 sm:px-6 bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-900/10">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <Icons.file className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                    </div>
                    <span className="truncate font-bold">Problem Details</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm pt-1">
                    Describe your coding challenge and let AI create the solution
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pt-2">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
                      <FormField
                        control={form.control}
                        name="problem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base font-semibold">Programming Problem</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g., Create a function that reverses a string..."
                                className="min-h-[100px] sm:min-h-[140px] resize-y focus-visible:ring-purple-500 text-sm sm:text-base"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        <FormField
                          control={form.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300">Language</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="focus:ring-purple-500 h-10 bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-slate-800 transition-colors">
                                    <SelectValue placeholder="Select language" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="javascript">JavaScript</SelectItem>
                                  <SelectItem value="python">Python</SelectItem>
                                  <SelectItem value="java">Java</SelectItem>
                                  <SelectItem value="c++">C++</SelectItem>
                                  <SelectItem value="typescript">TypeScript</SelectItem>
                                  <SelectItem value="go">Go</SelectItem>
                                  <SelectItem value="rust">Rust</SelectItem>
                                  <SelectItem value="ruby">Ruby</SelectItem>
                                  <SelectItem value="php">PHP</SelectItem>
                                  <SelectItem value="swift">Swift</SelectItem>
                                  <SelectItem value="kotlin">Kotlin</SelectItem>
                                  <SelectItem value="c#">C#</SelectItem>
                                  <SelectItem value="r">R</SelectItem>
                                  <SelectItem value="sql">SQL</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="difficulty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300">Difficulty</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="focus:ring-purple-500 h-10 bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-slate-800 transition-colors">
                                    <SelectValue placeholder="Select difficulty" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="context"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm sm:text-base font-semibold">Additional Context</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g., 'Optimize for performance'..."
                                className="resize-y min-h-[80px] sm:min-h-[100px] focus-visible:ring-purple-500 text-sm sm:text-base"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Add constraints or requirements
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-purple-50 dark:bg-gray-900/50 dark:hover:bg-gray-800 transition-colors cursor-pointer flex-1 group">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                            onChange={(e) => form.setValue('optimizeCode', e.target.checked)}
                          />
                          <div className="flex flex-col">
                            <span className="text-xs sm:text-sm font-semibold group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">Optimize Code</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Focus on performance</span>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-blue-50 dark:bg-gray-900/50 dark:hover:bg-gray-800 transition-colors cursor-pointer flex-1 group">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                            onChange={(e) => form.setValue('generateMultiple', e.target.checked)}
                          />
                          <div className="flex flex-col">
                            <span className="text-xs sm:text-sm font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">Multiple Solutions</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Get alternative approaches</span>
                          </div>
                        </label>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg" 
                        disabled={isPending}
                      >
                        {isPending ? (
                          <>
                            <Icons.spinner className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            <span className="hidden sm:inline">Generating Solution...</span>
                            <span className="sm:hidden">Generating...</span>
                          </>
                        ) : (
                          <>
                            <Icons.sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="hidden sm:inline">Generate Solution</span>
                            <span className="sm:hidden">Generate</span>
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              {/* Results Preview - Right Panel */}
              <Card className="lg:col-span-3 border-2 shadow-lg overflow-hidden flex flex-col h-full">
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                <CardHeader className="space-y-1 pb-3 sm:pb-4 px-4 sm:px-6 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <Icons.code className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                    </div>
                    <span className="truncate font-bold">Generated Solution</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm pt-1">
                    Your AI-generated code with explanation
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 flex-1 flex flex-col pt-2">
                  {isPending ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px] bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                        <Icons.spinner className="relative h-12 w-12 sm:h-16 sm:w-16 animate-spin text-purple-600" />
                      </div>
                      <p className="mt-4 sm:mt-6 text-base sm:text-lg font-medium text-center px-4">Generating your code solution...</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2 text-center px-4">AI is analyzing your requirements</p>
                    </div>
                  ) : latestSnippet ? (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Problem Section */}
                      <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-lg border">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <Icons.help className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Problem Statement</h3>
                            <MarkdownText text={latestSnippet.problem} className="text-xs sm:text-sm leading-relaxed break-words" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Code Editor Section */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm sm:text-base">Solution Code</h3>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {latestSnippet.language}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                            onClick={() => {
                              navigator.clipboard.writeText(editableCode);
                              toast({
                                title: "Copied!",
                                description: "Code copied to clipboard",
                              });
                            }}
                          >
                            <Icons.copy className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Copy</span>
                          </Button>
                        </div>
                        <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm">
                          <MonacoCodeEditor
                            value={editableCode}
                            onChange={setEditableCode}
                            language={latestSnippet.language?.toLowerCase() || "javascript"}
                            onLanguageChange={() => {}}
                            onRun={runCode}
                            isRunning={isRunning}
                            output={codeOutput}
                            onClearOutput={() => setCodeOutput("")}
                            stdin={codeStdin}
                            onStdinChange={/Scanner|cin|input\s*\(|scanf|readline/i.test(editableCode) ? setCodeStdin : undefined}
                            onDownload={() => downloadCode(editableCode, latestSnippet.language, latestSnippet.title || 'code')}
                            onAnalyze={() => analyzeComplexity(editableCode)}
                          >
                            {/* Complexity Analysis */}
                            {showComplexity && codeComplexity && (
                              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 border-b border-yellow-200 dark:border-yellow-900">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1">
                                    <Icons.zap className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <h3 className="font-semibold text-base mb-1">Time Complexity Analysis</h3>
                                      <MarkdownText text={codeComplexity} className="text-sm font-mono font-semibold text-yellow-700 dark:text-yellow-400" />
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowComplexity(false)}
                                  >
                                    <Icons.close className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </MonacoCodeEditor>
                        </div>
                        
                        {/* Refinement Section */}
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            placeholder="Ask AI to refine this code (e.g., 'Optimize it', 'Add comments')..."
                            value={refinePrompt}
                            onChange={(e) => setRefinePrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleRefine();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button 
                            onClick={handleRefine} 
                            disabled={isPending || !refinePrompt.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {isPending ? <Icons.spinner className="h-4 w-4 animate-spin" /> : <Icons.sparkles className="h-4 w-4 mr-2" />}
                            Refine
                          </Button>
                        </div>
                      </div>
                      
                      {/* Explanation Section */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <Icons.help className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-base mb-2">Code Explanation</h3>
                            <MarkdownText text={latestSnippet.explanation} className="text-sm leading-relaxed" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px] text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4">
                      <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-full shadow-lg mb-4 sm:mb-6">
                        <Icons.code className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400" />
                      </div>
                      <h3 className="font-semibold text-lg sm:text-xl mb-2 px-4">Ready to Generate Code</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-4">
                        Fill out the problem details and click "Generate Solution" to create your first AI-powered code
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="playground" className="mt-4 sm:mt-6 md:mt-8">
            <Card className="border-2 shadow-lg overflow-hidden">
              <CardHeader className="space-y-1 pb-3 sm:pb-4 px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2">
                  <Icons.play className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  <span className="truncate">Code Playground</span>
                </CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm">
                  Professional code editor with IntelliSense, syntax highlighting, and more
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <MonacoCodeEditor
                  value={playgroundCode}
                  onChange={setPlaygroundCode}
                  language={playgroundLanguage}
                  onLanguageChange={handleLanguageChange}
                  onRun={runPlaygroundCode}
                  isRunning={isPlaygroundRunning}
                  output={playgroundOutput}
                  onClearOutput={() => setPlaygroundOutput("")}
                  stdin={playgroundStdin}
                  onStdinChange={/Scanner|cin|input\s*\(|scanf|readline/i.test(playgroundCode) ? setPlaygroundStdin : undefined}
                  showTemplates={() => setShowTemplates(!showTemplates)}
                  onDownload={() => downloadCode(playgroundCode, playgroundLanguage, 'playground-code')}
                  onAnalyze={() => analyzeComplexity(playgroundCode)}
                >
                  {/* Templates Dropdown */}
                  {showTemplates && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-b">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Icons.bookOpen className="h-4 w-4" />
                        Quick Start Templates
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {CODE_TEMPLATES[playgroundLanguage as keyof typeof CODE_TEMPLATES] ? (
                          Object.keys(CODE_TEMPLATES[playgroundLanguage as keyof typeof CODE_TEMPLATES]).map((template) => (
                            <Button
                              key={template}
                              variant="outline"
                              size="sm"
                              className="justify-start"
                              onClick={() => loadTemplate(template)}
                            >
                              {template}
                            </Button>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground col-span-full">
                            No templates available for {playgroundLanguage}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Complexity Analysis for Playground */}
                  {showComplexity && codeComplexity && (
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 border-b border-yellow-200 dark:border-yellow-900">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <Icons.zap className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h3 className="font-semibold text-base mb-1">Time Complexity Analysis</h3>
                            <MarkdownText text={codeComplexity} className="text-sm font-mono font-semibold text-yellow-700 dark:text-yellow-400" />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowComplexity(false)}
                        >
                          <Icons.close className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </MonacoCodeEditor>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="mt-4 sm:mt-6 md:mt-8">
            <Card className="border-2 shadow-lg">
              <CardHeader className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2">
                      <Icons.bookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 flex-shrink-0" />
                      <span className="truncate">Your Saved Solutions</span>
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs sm:text-sm">
                      Browse and manage your code snippets
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <Select value={selectedLanguageFilter} onValueChange={setSelectedLanguageFilter}>
                      <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] focus:ring-purple-500 h-10 bg-white dark:bg-gray-950">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="c++">C++</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="go">Go</SelectItem>
                        <SelectItem value="rust">Rust</SelectItem>
                        <SelectItem value="ruby">Ruby</SelectItem>
                        <SelectItem value="php">PHP</SelectItem>
                        <SelectItem value="swift">Swift</SelectItem>
                        <SelectItem value="kotlin">Kotlin</SelectItem>
                        <SelectItem value="c#">C#</SelectItem>
                        <SelectItem value="r">R</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedTagFilter} onValueChange={setSelectedTagFilter}>
                      <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] focus:ring-purple-500 h-10 bg-white dark:bg-gray-950">
                        <SelectValue placeholder="Tags" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {tagsData?.tags?.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {isLoadingSnippets ? (
                  <div className="flex flex-col items-center justify-center p-8 sm:p-12">
                    <Icons.spinner className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-purple-600 mb-3 sm:mb-4" />
                    <p className="text-muted-foreground text-sm sm:text-base">Loading your solutions...</p>
                  </div>
                ) : (snippets && snippets.snippets && snippets.snippets.length > 0) ? (
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    {snippets.snippets.map((snippet: CodeSnippet) => (
                      <Card key={snippet.id} className="overflow-hidden border-2 hover:border-purple-200 dark:hover:border-purple-900 hover:shadow-xl transition-all duration-300">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-3 sm:py-4 px-4 sm:px-6 border-b">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                              <div className="flex-1 min-w-0 w-full">
                                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                  <div className="p-1.5 bg-white dark:bg-gray-800 rounded-md shadow-sm flex-shrink-0">
                                    <Icons.file className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                                  </div>
                                  <span className="truncate">{snippet.title}</span>
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end bg-white/50 dark:bg-gray-800/50 p-1 rounded-lg">
                                <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs px-2 py-1 uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 mr-1">
                                  {snippet.language}
                                </Badge>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 hover:bg-white/50 dark:hover:bg-gray-800/50"
                                  onClick={() => {
                                    navigator.clipboard.writeText(snippet.code);
                                    toast({
                                      title: "Copied!",
                                      description: "Code snippet copied to clipboard",
                                    });
                                  }}
                                >
                                  <Icons.copy className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  onClick={() => handleEditSnippet(snippet)}
                                >
                                  <Icons.settings className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => handleDeleteSnippet(snippet.id)}
                                >
                                  <Icons.trash className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                            {snippet.tags && Array.isArray(snippet.tags) && snippet.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 sm:gap-2">
                                {snippet.tags.map((tag, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-3 sm:pt-4 md:pt-5 space-y-3 sm:space-y-4 md:space-y-5 px-3 sm:px-4 md:px-6">
                          <div className="p-2 sm:p-3 bg-purple-50 dark:bg-gray-900 rounded-lg border">
                            <div className="flex items-start gap-2">
                              <Icons.help className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h3 className="text-xs sm:text-sm font-semibold mb-1">Problem</h3>
                                <p className="text-xs sm:text-sm leading-relaxed break-words">{snippet.problem}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-xs sm:text-sm font-semibold mb-2 flex items-center gap-2">
                              <Icons.code className="h-3 w-3 sm:h-4 sm:w-4" />
                              Solution Code
                            </h3>
                            <div className="relative border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                              <MonacoCodeEditor
                                value={snippet.code}
                                onChange={() => {}}
                                language={snippet.language?.toLowerCase() || "javascript"}
                                onLanguageChange={() => {}}
                                onRun={() => {}}
                                isRunning={false}
                                output={""}
                                onClearOutput={() => {}}
                                readOnly={true}
                                height="200px"
                              />
                            </div>
                          </div>
                          
                          <div className="p-2 sm:p-3 bg-blue-50 dark:bg-gray-900 rounded-lg border">
                            <div className="flex items-start gap-2">
                              <Icons.help className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h3 className="text-xs sm:text-sm font-semibold mb-1">Explanation</h3>
                                <p className="text-xs sm:text-sm leading-relaxed break-words">{snippet.explanation}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-full mb-4 sm:mb-6">
                      <Icons.bookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-purple-600" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">No Saved Solutions Yet</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-4 sm:mb-6">
                      Start generating code solutions and they'll appear here
                    </p>
                    <Button 
                      className="gap-2 h-9 sm:h-10"
                      onClick={() => setActiveTab("generator")}
                    >
                      <Icons.sparkles className="h-4 w-4" />
                      <span className="text-sm sm:text-base">Generate Your First Solution</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Icons.settings className="h-4 w-4 sm:h-5 sm:w-5" />
                Edit Code Snippet
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Make changes to your code snippet below
              </DialogDescription>
            </DialogHeader>
            {editingSnippet && (
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 block">Title</label>
                  <input
                    type="text"
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={editingSnippet.title}
                    onChange={(e) => setEditingSnippet({ ...editingSnippet, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 block">Problem</label>
                  <Textarea
                    className="min-h-[80px] sm:min-h-[100px] text-sm"
                    value={editingSnippet.problem}
                    onChange={(e) => setEditingSnippet({ ...editingSnippet, problem: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 block">Code</label>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm">
                    <MonacoCodeEditor
                      value={editingSnippet.code}
                      onChange={(code) => setEditingSnippet({ ...editingSnippet, code })}
                      language={editingSnippet.language?.toLowerCase() || "javascript"}
                      onLanguageChange={() => {}}
                      onRun={() => {}}
                      isRunning={false}
                      output={""}
                      onClearOutput={() => {}}
                      height="300px"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 block">Explanation</label>
                  <Textarea
                    className="min-h-[80px] sm:min-h-[100px] text-sm"
                    value={editingSnippet.explanation}
                    onChange={(e) => setEditingSnippet({ ...editingSnippet, explanation: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingSnippet(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingSnippet) {
                    updateSnippet({
                      id: editingSnippet.id,
                      updates: {
                        title: editingSnippet.title,
                        problem: editingSnippet.problem,
                        code: editingSnippet.code,
                        explanation: editingSnippet.explanation,
                      },
                    });
                  }
                }}
                disabled={isUpdating}
                className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
              >
                {isUpdating ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icons.check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Icons.warning className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm">
                This action cannot be undone. This will permanently delete your code snippet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel onClick={() => setDeletingSnippetId(null)} className="w-full sm:w-auto">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {isDeleting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Icons.trash className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}