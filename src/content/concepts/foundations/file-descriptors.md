---
title: Filesystems & File Descriptors
slug: file-descriptors
summary: "How operating systems abstract files, network connections, and pipes as stream numbers called File Descriptors."
difficulty: beginner
chapterId: foundations
domain: Foundations
estimatedMinutes: 9
prerequisites: [processes-threads]
related: [http]
seo_title: "Filesystems and File Descriptors (FD) Explained simply"
seo_description: "Learn how Linux/UNIX treats everything as a file using File Descriptors, limits on socket descriptors, and practical analogies."
canonical_url: "/concepts/file-descriptors"
code_examples:
  - language: Go
    title: Raw file descriptor access in Go
    code: |
      package main
      import (
          "fmt"
          "os"
      )

      func main() {
          file, err := os.Open("example.txt")
          if err != nil {
              return
          }
          defer file.Close()

          // Obtain raw file descriptor index from operating system
          fd := file.Fd()
          fmt.Printf("File descriptor index: %d\n", fd)
      }
  - language: Python
    title: Manipulating file descriptors in Python
    code: |
      import os

      # Open file and get descriptor
      fd = os.open("test.txt", os.O_WRONLY | os.O_CREAT)
      print(f"File descriptor: {fd}")

      # Write using raw descriptor index
      os.write(fd, b"Writing directly to FD\n")
      os.close(fd)
---

## The Concept

In UNIX-like operating systems (including Linux and macOS), almost all input/output streams are abstracted as files. Whether you are reading a database file, writing to standard output, listening on a TCP network socket, or pipe-streaming data between processes, you communicate with the OS using **File Descriptors (FDs)**.

A File Descriptor is simply a non-negative integer (like `3`, `4`, or `101`) assigned by the OS representing an entry in the process's open-file table.

---

## Practical Analogy

Think of File Descriptors as the **Post Office Box Key**:

* When your program opens a file or creates a TCP socket, it requests access from the OS.
* The OS doesn't hand the process the physical file or socket cables. Instead, it places the open connection inside **PO Box 3** and hands your process the key labeled **`3`**.
* Whenever your program wants to send or write data, it goes to the OS post office, shows the key `3`, and says "put this mail inside box 3". Your process doesn't need to know where the physical box or target file sits on the hard drive; the post office (OS) handles the routing.

---

## Why it matters in Backend Systems

1. **Connection Limits ("Too many open files")**: Sockets are file descriptors. If your server is handling 10,000 concurrent websocket connections, it is using 10,000 file descriptors. If your operating system process has a soft limit of `1024` descriptors (the default on many systems), your application will crash with `EMFILE: Too many open files` errors.
2. **Standard I/O Streams**: Every process starts with three default file descriptors:
   * **`0`**: Standard Input (`stdin`)
   * **`1`**: Standard Output (`stdout`)
   * **`2`**: Standard Error (`stderr`)
3. **Fault Isolation**: File descriptors are scoped to individual processes. Process A cannot hijack or write to Process B's file descriptors without authorization.
